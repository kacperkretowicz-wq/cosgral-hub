import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { listPortalClients } from "@/lib/portal-db";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const clients = await listPortalClients();
    return NextResponse.json({ clients });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
