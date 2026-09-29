import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { smGetPost, smUpdatePost } from "@/lib/sm-db";

const META_API = "https://graph.facebook.com/v19.0";
const LI_API = "https://api.linkedin.com/v2";

// ── Meta Graph API helpers ────────────────────────────────────────────────

async function metaPost(endpoint: string, body: Record<string, string>) {
  const res = await fetch(`${META_API}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Meta API error: ${JSON.stringify(err)}`);
  }
  return res.json();
}

async function waitForMedia(containerId: string, token: string, attempts = 8) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(
      `${META_API}/${containerId}?fields=status_code&access_token=${token}`,
    );
    const data = await res.json();
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR" || data.status_code === "EXPIRED")
      throw new Error(`Media container failed: ${data.status_code}`);
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  throw new Error("Media container timeout");
}

async function publishInstagram(post: Awaited<ReturnType<typeof smGetPost>>) {
  if (!post) throw new Error("Post not found");
  const token = process.env.META_ACCESS_TOKEN;
  const igId = process.env.META_INSTAGRAM_ACCOUNT_ID;
  if (!token || !igId) throw new Error("META_ACCESS_TOKEN / META_INSTAGRAM_ACCOUNT_ID missing");

  const caption = `${post.caption}\n\n${post.hashtags.join(" ")}`.trim();

  if (post.post_type === "story") {
    const container = await metaPost(`/${igId}/media`, {
      image_url: post.image_url!,
      media_type: "STORIES",
      access_token: token,
    });
    await waitForMedia(container.id, token);
    const result = await metaPost(`/${igId}/media_publish`, {
      creation_id: container.id,
      access_token: token,
    });
    return result.id as string;
  }

  const container = await metaPost(`/${igId}/media`, {
    image_url: post.image_url ?? "",
    caption,
    access_token: token,
  });
  await waitForMedia(container.id, token);
  const result = await metaPost(`/${igId}/media_publish`, {
    creation_id: container.id,
    access_token: token,
  });
  return result.id as string;
}

async function publishFacebook(post: Awaited<ReturnType<typeof smGetPost>>) {
  if (!post) throw new Error("Post not found");
  const token = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.META_FACEBOOK_PAGE_ID;
  if (!token || !pageId) throw new Error("META_ACCESS_TOKEN / META_FACEBOOK_PAGE_ID missing");

  const message = `${post.caption}\n\n${post.hashtags.join(" ")}`.trim();

  if (post.image_url) {
    const result = await metaPost(`/${pageId}/photos`, {
      url: post.image_url,
      message,
      access_token: token,
    });
    return (result.post_id ?? result.id) as string;
  }
  const result = await metaPost(`/${pageId}/feed`, {
    message,
    access_token: token,
  });
  return result.id as string;
}

async function publishLinkedIn(post: Awaited<ReturnType<typeof smGetPost>>) {
  if (!post) throw new Error("Post not found");
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const orgId = process.env.LINKEDIN_ORGANIZATION_ID;
  if (!token || !orgId) throw new Error("LINKEDIN_ACCESS_TOKEN / LINKEDIN_ORGANIZATION_ID missing");

  const text = `${post.caption}\n\n${post.hashtags.slice(0, 7).join(" ")}`.slice(0, 3000);
  const headers = {
    Authorization: `Bearer ${token}`,
    "X-Restli-Protocol-Version": "2.0.0",
    "Content-Type": "application/json",
  };

  let media: object[] | undefined;

  if (post.image_url) {
    // Register upload
    const regRes = await fetch(`${LI_API}/assets?action=registerUpload`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: `urn:li:organization:${orgId}`,
          serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
        },
      }),
    });
    const regData = await regRes.json();
    const uploadUrl = regData?.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
    const asset = regData?.value?.asset;

    if (uploadUrl && asset) {
      // Download image and upload to LinkedIn
      const imgRes = await fetch(post.image_url);
      const imgBuf = await imgRes.arrayBuffer();
      await fetch(uploadUrl, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/png" },
        body: imgBuf,
      });
      media = [{ status: "READY", description: { text: text.slice(0, 200) }, media: asset, title: { text: "Cosgral" } }];
    }
  }

  const body = {
    author: `urn:li:organization:${orgId}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: media ? "IMAGE" : "NONE",
        ...(media ? { media } : {}),
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };

  const res = await fetch(`${LI_API}/ugcPosts`, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`LinkedIn error: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return (data.id ?? res.headers.get("id") ?? "published") as string;
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const post = await smGetPost(id);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.status !== "approved")
    return NextResponse.json({ error: `Post musi mieć status 'approved', jest: ${post.status}` }, { status: 422 });
  if (!post.image_url && post.post_type !== "text")
    return NextResponse.json({ error: "Brak image_url — post potrzebuje grafiki" }, { status: 422 });

  try {
    let platformPostId: string;

    switch (post.platform) {
      case "instagram": platformPostId = await publishInstagram(post); break;
      case "facebook":  platformPostId = await publishFacebook(post); break;
      case "linkedin":  platformPostId = await publishLinkedIn(post); break;
      default: throw new Error(`Unknown platform: ${post.platform}`);
    }

    const updated = await smUpdatePost(id, {
      status: "published",
      platform_post_id: platformPostId,
      published_at: new Date().toISOString(),
    });
    return NextResponse.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await smUpdatePost(id, { status: "failed", error_message: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
