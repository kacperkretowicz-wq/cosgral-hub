import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export type SmPlatform = "instagram" | "facebook" | "linkedin";
export type SmPostType = "static" | "carousel" | "story" | "reel" | "text";
export type SmPostStatus =
  | "draft"
  | "approved"
  | "rejected"
  | "scheduled"
  | "published"
  | "failed";

export interface SmPost {
  id: string;
  platform: SmPlatform;
  post_type: SmPostType;
  theme: string;
  caption: string;
  hashtags: string[];
  image_url: string | null;
  image_urls: string[] | null;
  video_url: string | null;
  status: SmPostStatus;
  platform_post_id: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmQueueStats {
  total: number;
  draft: number;
  approved: number;
  scheduled: number;
  published_today: number;
  failed: number;
}

// ── CRUD ──────────────────────────────────────────────────────────────────

export async function smListPosts(opts?: {
  status?: SmPostStatus | SmPostStatus[];
  platform?: SmPlatform;
  limit?: number;
  offset?: number;
}): Promise<SmPost[]> {
  const sb = getServiceClient();
  let query = sb.from("sm_posts").select("*");

  if (opts?.status) {
    const statuses = Array.isArray(opts.status) ? opts.status : [opts.status];
    query = query.in("status", statuses);
  }
  if (opts?.platform) query = query.eq("platform", opts.platform);

  query = query
    .order("created_at", { ascending: false })
    .range(opts?.offset ?? 0, (opts?.offset ?? 0) + (opts?.limit ?? 50) - 1);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as SmPost[];
}

export async function smGetPost(id: string): Promise<SmPost | null> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("sm_posts")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as SmPost;
}

export async function smCreatePost(
  post: Omit<SmPost, "id" | "created_at" | "updated_at">,
): Promise<SmPost> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("sm_posts")
    .insert(post)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SmPost;
}

export async function smUpdatePost(
  id: string,
  patch: Partial<SmPost>,
): Promise<SmPost> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("sm_posts")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SmPost;
}

export async function smDeletePost(id: string): Promise<void> {
  const sb = getServiceClient();
  const { error } = await sb.from("sm_posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function smGetStats(): Promise<SmQueueStats> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("sm_posts")
    .select("status, published_at");
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as { status: SmPostStatus; published_at: string | null }[];
  const todayStr = new Date().toISOString().split("T")[0];

  return {
    total: rows.length,
    draft: rows.filter((r) => r.status === "draft").length,
    approved: rows.filter((r) => r.status === "approved").length,
    scheduled: rows.filter((r) => r.status === "scheduled").length,
    published_today: rows.filter(
      (r) => r.status === "published" && r.published_at?.startsWith(todayStr),
    ).length,
    failed: rows.filter((r) => r.status === "failed").length,
  };
}
