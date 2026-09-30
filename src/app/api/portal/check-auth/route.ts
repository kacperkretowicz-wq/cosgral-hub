/** GET /api/portal/check-auth?slug=xxx — public endpoint, tells if client has portal_auth */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ has_auth: false });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: client } = await db
    .from("crm_clients")
    .select("id")
    .eq("portal_slug", slug)
    .single();

  if (!client) return NextResponse.json({ has_auth: false });

  const { data: auth } = await db
    .from("portal_auth")
    .select("id")
    .eq("crm_client_id", client.id)
    .single();

  return NextResponse.json({ has_auth: Boolean(auth) });
}
