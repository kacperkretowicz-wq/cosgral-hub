import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { validatePortalSession, createPortalNote, deletePortalNote } from "@/lib/portal-db";
import { cookies } from "next/headers";
import { z } from "zod";

const createSchema = z.object({
  crm_client_id: z.string().uuid(),
  content: z.string().min(1).max(10000),
});

async function resolvePortalCaller(crm_client_id: string): Promise<
  { ok: true; sender: "admin" | "client"; name: string } | { ok: false }
> {
  // Try admin first
  const { requireAdmin: ra } = await import("@/lib/api-auth");
  const adminAuth = await ra();
  if (!("error" in adminAuth)) {
    return { ok: true, sender: "admin", name: "Cosgral" };
  }

  // Try portal session cookie
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_session")?.value;
  if (!token) return { ok: false };
  const session = await validatePortalSession(token);
  if (!session || session.crm_client_id !== crm_client_id) return { ok: false };
  return { ok: true, sender: "client", name: session.requester_name };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const crm_client_id = searchParams.get("crm_client_id");
  if (!crm_client_id) {
    return NextResponse.json({ error: "Brak crm_client_id" }, { status: 400 });
  }

  const caller = await resolvePortalCaller(crm_client_id);
  if (!caller.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { listPortalNotes: list } = await import("@/lib/portal-db");
  const notes = await list(crm_client_id);
  return NextResponse.json({ notes });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }
  const { crm_client_id, content } = parsed.data;

  const caller = await resolvePortalCaller(crm_client_id);
  if (!caller.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const note = await createPortalNote(crm_client_id, content, caller.sender, caller.name);
  return NextResponse.json({ note });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Brak id" }, { status: 400 });

  await deletePortalNote(id);
  return NextResponse.json({ ok: true });
}
