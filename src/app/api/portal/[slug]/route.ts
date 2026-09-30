import { NextResponse } from "next/server";
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

  // Verify if caller is admin
  const isAdmin = await (async () => {
    try {
      const { requireAdmin: ra } = await import("@/lib/api-auth");
      const r = await ra();
      return !("error" in r);
    } catch {
      return false;
    }
  })();

  // Check portal session for clients
  let callerName: string | null = null;
  let isAuthenticatedClient = false;
  if (!isAdmin) {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("portal_session")?.value;
    if (sessionToken) {
      const session = await validatePortalSession(sessionToken);
      if (session) {
        callerName = session.requester_name;
        isAuthenticatedClient = true;
      }
    }
  }

  // Resolve slug → client (always allowed — needed to show login/setup screen)
  const client = await getCrmClientBySlug(slug);
  if (!client) {
    return NextResponse.json({ error: "Katalog nie istnieje" }, { status: 404 });
  }

  // Unauthenticated visitor: return only basic client info so the portal can
  // render the SetupAuth / Login screens without exposing files.
  if (!isAdmin && !isAuthenticatedClient) {
    return NextResponse.json({ client: { id: client.id, company_name: client.company_name }, caller: "guest" });
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
