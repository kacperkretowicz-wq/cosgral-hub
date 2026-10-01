import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validatePortalSession } from "@/lib/portal-db";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await validatePortalSession(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await db
    .from("projects")
    .select("id, title, status, service_type, deadline, assigned_to, created_at, updated_at")
    .eq("crm_client_id", session.crm_client_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data ?? [] });
}
