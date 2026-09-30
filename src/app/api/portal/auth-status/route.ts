import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { createClient } from "@supabase/supabase-js";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/** GET /api/portal/auth-status?crm_client_id=xxx — check if client has set up auth */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const crm_client_id = searchParams.get("crm_client_id");
  if (!crm_client_id) return NextResponse.json({ error: "Missing crm_client_id" }, { status: 400 });

  const { data } = await db()
    .from("portal_auth")
    .select("id, username, created_at, session_expires_at")
    .eq("crm_client_id", crm_client_id)
    .single();

  return NextResponse.json({ auth: data ?? null });
}

/** DELETE /api/portal/auth-status?crm_client_id=xxx — revoke client portal access */
export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const crm_client_id = searchParams.get("crm_client_id");
  if (!crm_client_id) return NextResponse.json({ error: "Missing crm_client_id" }, { status: 400 });

  const { error } = await db().from("portal_auth").delete().eq("crm_client_id", crm_client_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
