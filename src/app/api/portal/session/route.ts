import { NextResponse } from "next/server";
import { validatePortalSession } from "@/lib/portal-db";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_session")?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false });
  }

  const session = await validatePortalSession(token);
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    crm_client_id: session.crm_client_id,
    requester_name: session.requester_name,
    requester_email: session.requester_email,
  });
}
