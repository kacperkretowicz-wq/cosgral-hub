import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { smGetPost, smUpdatePost, smDeletePost } from "@/lib/sm-db";

const patchSchema = z.object({
  caption: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  image_url: z.string().nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
  status: z.enum(["draft", "approved", "rejected", "scheduled", "published", "failed"]).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const post = await smGetPost(id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(post);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = patchSchema.parse(body);
    const post = await smUpdatePost(id, parsed);
    return NextResponse.json(post);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  try {
    await smDeletePost(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
