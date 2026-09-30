/**
 * POST /api/portal/gdrive-init
 *
 * White-label Google Drive resumable upload initiation.
 * Called by the portal client BEFORE sending the file.
 *
 * Flow:
 *  1. Verify caller (admin session or portal_session cookie)
 *  2. Ensure a per-client folder exists in Google Drive under GOOGLE_DRIVE_ROOT_FOLDER_ID
 *  3. Ask Google for a Resumable Upload Session URI (no file data sent to Netlify)
 *  4. Return { uploadUri, accessToken, folderId } to the browser
 *     → browser will PUT the file directly to uploadUri, showing progress
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { validatePortalSession } from "@/lib/portal-db";
import { getGoogleAuth, isGoogleWorkspaceConfigured } from "@/lib/google-auth";
import { google } from "googleapis";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Ensure a Drive folder exists for the client; return its ID. */
async function ensureClientFolder(
  drive: ReturnType<typeof google.drive>,
  rootFolderId: string,
  crm_client_id: string,
  companyName: string
): Promise<string> {
  // Check cache in Supabase
  const supabase = db();
  const { data: client } = await supabase
    .from("crm_clients")
    .select("gdrive_portal_folder_id")
    .eq("id", crm_client_id)
    .single();

  if (client?.gdrive_portal_folder_id) {
    return client.gdrive_portal_folder_id as string;
  }

  // Create folder in Drive
  const folderName = `[Portal] ${companyName} (${crm_client_id.slice(0, 8)})`;
  const res = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootFolderId],
    },
    fields: "id",
  });
  const folderId = res.data.id!;

  // Cache in crm_clients (column may not exist — ignore error)
  await supabase
    .from("crm_clients")
    .update({ gdrive_portal_folder_id: folderId })
    .eq("id", crm_client_id);

  return folderId;
}

export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  let caller: { sender: "admin" | "client"; name: string } | null = null;
  let crm_client_id_from_session: string | null = null;

  const adminAuth = await requireAdmin();
  if (!("error" in adminAuth)) {
    caller = { sender: "admin", name: "Cosgral" };
  } else {
    const cookieStore = await cookies();
    const token = cookieStore.get("portal_session")?.value;
    if (token) {
      const session = await validatePortalSession(token);
      if (session) {
        caller = { sender: "client", name: session.requester_name };
        crm_client_id_from_session = session.crm_client_id;
      }
    }
  }

  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Input ─────────────────────────────────────────────────────────────────
  const body = await request.json() as {
    file_name: string;
    mime_type: string;
    size_bytes: number;
    crm_client_id: string;
  };

  const { file_name, mime_type, size_bytes } = body;
  const crm_client_id = body.crm_client_id ?? crm_client_id_from_session;

  if (!file_name || !crm_client_id) {
    return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
  }
  if (caller.sender === "client" && crm_client_id_from_session !== crm_client_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // ── Google Drive check ────────────────────────────────────────────────────
  if (!isGoogleWorkspaceConfigured()) {
    return NextResponse.json(
      { error: "Google Drive nie jest skonfigurowany. Skontaktuj się z Cosgral." },
      { status: 503 }
    );
  }

  const auth = getGoogleAuth()!;
  const drive = google.drive({ version: "v3", auth });

  // Get fresh access token (auto-refreshes via refresh_token)
  const { token: accessToken } = await auth.getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Brak tokenu Google" }, { status: 503 });
  }

  // Fetch company name for folder naming
  const supabase = db();
  const { data: clientRow } = await supabase
    .from("crm_clients")
    .select("company_name")
    .eq("id", crm_client_id)
    .single();
  const companyName = (clientRow?.company_name as string | null) ?? "Klient";

  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;
  const folderId = await ensureClientFolder(drive, rootFolderId, crm_client_id, companyName);

  // ── Initiate Resumable Upload ─────────────────────────────────────────────
  // We call the Drive API directly (fetch) rather than through the SDK
  // because the SDK doesn't expose the raw Session URI header.
  const initRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mime_type || "application/octet-stream",
        "X-Upload-Content-Length": String(size_bytes ?? 0),
      },
      body: JSON.stringify({
        name: file_name,
        parents: [folderId],
      }),
    }
  );

  if (!initRes.ok) {
    const errText = await initRes.text();
    console.error("[gdrive-init] Drive API error:", errText);
    return NextResponse.json(
      { error: "Błąd Google Drive API: " + initRes.statusText },
      { status: 502 }
    );
  }

  const uploadUri = initRes.headers.get("Location");
  if (!uploadUri) {
    return NextResponse.json({ error: "Brak Location URI od Google" }, { status: 502 });
  }

  return NextResponse.json({ uploadUri, accessToken, folderId });
}
