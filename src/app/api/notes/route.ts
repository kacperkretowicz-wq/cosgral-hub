import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { getIntranetDb } from "@/lib/intranet-db";

const createSchema = z.object({
  content: z.string().min(1),
  project_id: z.string().uuid().nullable().optional(),
  crm_client_id: z.string().uuid().nullable().optional(),
});

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const project_id = searchParams.get("project_id") ?? undefined;
  const crm_client_id = searchParams.get("crm_client_id") ?? undefined;

  try {
    const data = await getIntranetDb().getNotes({ project_id, crm_client_id });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const parsed = createSchema.parse(body);
    const data = await getIntranetDb().createNote({
      content: parsed.content,
      project_id: parsed.project_id ?? null,
      crm_client_id: parsed.crm_client_id ?? null,
      author_email: auth.email,
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    await getIntranetDb().deleteNote(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
