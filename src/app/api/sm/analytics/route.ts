import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { smGetStats } from "@/lib/sm-db";

const META_API = "https://graph.facebook.com/v19.0";
const LI_API = "https://api.linkedin.com/v2";

async function igFollowers() {
  const token = process.env.META_ACCESS_TOKEN;
  const igId = process.env.META_INSTAGRAM_ACCOUNT_ID;
  if (!token || !igId) return null;
  try {
    const res = await fetch(
      `${META_API}/${igId}?fields=followers_count,media_count&access_token=${token}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return { followers: data.followers_count as number, posts: data.media_count as number };
  } catch { return null; }
}

async function fbFollowers() {
  const token = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.META_FACEBOOK_PAGE_ID;
  if (!token || !pageId) return null;
  try {
    const res = await fetch(`${META_API}/${pageId}?fields=fan_count&access_token=${token}`);
    if (!res.ok) return null;
    const data = await res.json();
    return { followers: data.fan_count as number };
  } catch { return null; }
}

async function liFollowers() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const orgId = process.env.LINKEDIN_ORGANIZATION_ID;
  if (!token || !orgId) return null;
  try {
    const res = await fetch(
      `${LI_API}/organizationalEntityFollowerStatistics?q=organizationalEntityFollowerStatistics&organizationalEntity=urn:li:organization:${orgId}`,
      { headers: { Authorization: `Bearer ${token}`, "X-Restli-Protocol-Version": "2.0.0" } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const el = data?.elements?.[0];
    const counts = el?.followerCountsByAssociationType?.find((f: { followerType: string }) => f.followerType === "MEMBER");
    const followers = counts
      ? (counts.followerCounts?.organicFollowerCount ?? 0) + (counts.followerCounts?.paidFollowerCount ?? 0)
      : null;
    return { followers };
  } catch { return null; }
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const [stats, ig, fb, li] = await Promise.all([
    smGetStats(),
    igFollowers(),
    fbFollowers(),
    liFollowers(),
  ]);

  return NextResponse.json({
    queue: stats,
    platforms: {
      instagram: ig,
      facebook: fb,
      linkedin: li,
    },
    generated_at: new Date().toISOString(),
  });
}
