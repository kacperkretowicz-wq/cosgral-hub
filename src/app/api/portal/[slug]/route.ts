import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import {
  getCrmClientBySlug,
  listPortalFiles,
  listPortalNotes,
  listPortalMessages,
  listAccessRequests,
  validatePortalSession,
} from "@/lib/portal-db";
import { cookies } from "next/headers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // Check if caller is admin or authenticated client
  const isAdmin = await (async () => {
    try {
      const { requireAdmin: ra } = await import("@/lib/api-auth");
      const r = await ra();
      return !("error" in r);
    } catch {
      return false;
    }
  })();

  let callerName: string | null = null;
  if (!isAdmin) {
    // Validate portal session cookie
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("portal_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const session = await validatePortalSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    callerName = session.requester_name;
  }

  const client = await getCrmClientBySlug(slug);
  if (!client) {
    return NextResponse.json({ error: "Katalog nie istnieje" }, { status: 404 });
  }

  try {
    const [files, notes, messages, requests] = await Promise.all([
      listPortalFiles(client.id),
      listPortalNotes(client.id),
      listPortalMessages(client.id),
      isAdmin ? listAccessRequests(client.id) : Promise.resolve([]),
    ]);

    return NextResponse.json({
      client,
      files,
      notes,
      messages,
      access_requests: requests,
      caller: isAdmin ? "admin" : "client",
      caller_name: callerName,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
