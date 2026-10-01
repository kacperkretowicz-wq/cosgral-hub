import { NextResponse } from "next/server";
import { validatePortalSession, createPortalMessage, listPortalMessages, sendPortalPush } from "@/lib/portal-db";
import { cookies } from "next/headers";
import { z } from "zod";

const postSchema = z.object({
  crm_client_id: z.string().uuid(),
  content: z.string().min(1).max(4000),
});

async function resolvePortalCaller(crm_client_id: string): Promise<
  { ok: true; sender: "admin" | "client"; name: string } | { ok: false }
> {
  const { requireAdmin: ra } = await import("@/lib/api-auth");
  const adminAuth = await ra();
  if (!("error" in adminAuth)) {
    return { ok: true, sender: "admin", name: "Cosgral" };
  }
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
  const after = searchParams.get("after") ?? undefined;
  if (!crm_client_id) {
    return NextResponse.json({ error: "Brak crm_client_id" }, { status: 400 });
  }

  const caller = await resolvePortalCaller(crm_client_id);
  if (!caller.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const messages = await listPortalMessages(crm_client_id, after);
  return NextResponse.json({ messages });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }
  const { crm_client_id, content } = parsed.data;

  const caller = await resolvePortalCaller(crm_client_id);
  if (!caller.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const message = await createPortalMessage(crm_client_id, caller.sender, caller.name, content);

  // Push notification: notify client when admin sends, notify nobody when client sends (admin uses Hub)
  if (caller.sender === "admin") {
    void sendPortalPush(crm_client_id, "Nowa wiadomość od Cosgral", content.slice(0, 100));
  }

  return NextResponse.json({ message });
}
