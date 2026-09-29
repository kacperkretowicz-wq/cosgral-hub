import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { smListPosts, smCreatePost, smGetStats } from "@/lib/sm-db";
import type { SmPlatform, SmPostType, SmPostStatus } from "@/lib/sm-db";

const createSchema = z.object({
  platform: z.enum(["instagram", "facebook", "linkedin"]),
  post_type: z.enum(["static", "carousel", "story", "reel", "text"]),
  theme: z.string().min(1),
  caption: z.string().default(""),
  hashtags: z.array(z.string()).default([]),
  image_url: z.string().nullable().optional(),
  image_urls: z.array(z.string()).nullable().optional(),
  video_url: z.string().nullable().optional(),
  status: z.enum(["draft", "approved", "rejected", "scheduled", "published", "failed"]).default("draft"),
  scheduled_at: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const platform = searchParams.get("platform") as SmPlatform | null;
  const limit = Number(searchParams.get("limit") ?? "50");
  const offset = Number(searchParams.get("offset") ?? "0");

  try {
    const [posts, stats] = await Promise.all([
      smListPosts({
        status: status ? (status.split(",") as SmPostStatus[]) : undefined,
        platform: platform ?? undefined,
        limit,
        offset,
      }),
      smGetStats(),
    ]);
    return NextResponse.json({ posts, stats }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const parsed = createSchema.parse(body);
    const post = await smCreatePost({
      platform: parsed.platform,
      post_type: parsed.post_type,
      theme: parsed.theme,
      caption: parsed.caption,
      hashtags: parsed.hashtags,
      image_url: parsed.image_url ?? null,
      image_urls: parsed.image_urls ?? null,
      video_url: parsed.video_url ?? null,
      status: parsed.status,
      platform_post_id: null,
      scheduled_at: parsed.scheduled_at ?? null,
      published_at: null,
      error_message: null,
    });
    return NextResponse.json(post);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
