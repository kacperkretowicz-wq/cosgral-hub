/**
 * POST /api/portal/gdrive-init
 *
 * White-label Google Drive resumable upload initiation.
 * Self-healing: auto-creates COSGRAL HUB root folder if the configured one
 * is missing or stale, caches the working ID in Supabase hub_settings.
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

/** Get or auto-create the COSGRAL HUB root folder in Google Drive.
 *  Priority: 1) hub_settings cache  2) GOOGLE_DRIVE_ROOT_FOLDER_ID env  3) create new */
async function getOrCreateRootFolder(
  drive: ReturnType<typeof google.drive>
): Promise<string> {
  const supabase = db();

  // 1. Check Supabase cache
  const { data: setting } = await supabase
    .from("hub_settings")
    .select("value")
    .eq("key", "gdrive_root_folder_id")
    .single();

  if (setting?.value) {
    // Verify it still exists
    try {
      await drive.files.get({ fileId: setting.value, fields: "id" });
      return setting.value;
    } catch {
      // Stale — fall through to create new
    }
  }

  // 2. Try env var
  const envId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (envId) {
    try {
      await drive.files.get({ fileId: envId, fields: "id" });
      // Save to cache
      await supabase.from("hub_settings").upsert({ key: "gdrive_root_folder_id", value: envId });
      return envId;
    } catch {
      // Stale env var — fall through to create new
    }
  }

  // 3. Auto-create "COSGRAL HUB" at Drive root
  const res = await drive.files.create({
    requestBody: {
      name: "COSGRAL HUB",
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });
  const newId = res.data.id!;
  await supabase.from("hub_settings").upsert({ key: "gdrive_root_folder_id", value: newId });
  return newId;
}

/** Ensure a per-client subfolder exists under the root. Returns folder ID. */
export async function ensureClientDriveFolder(
  drive: ReturnType<typeof google.drive>,
  crm_client_id: string,
  companyName: string
): Promise<string> {
  const supabase = db();

  // Check cache on crm_clients row
  const { data: client } = await supabase
    .from("crm_clients")
    .select("gdrive_portal_folder_id")
    .eq("id", crm_client_id)
    .single();

  if (client?.gdrive_portal_folder_id) {
    // Verify still accessible
    try {
      await drive.files.get({ fileId: client.gdrive_portal_folder_id as string, fields: "id" });
      return client.gdrive_portal_folder_id as string;
    } catch {
      // Stale — recreate
    }
  }

  const rootId = await getOrCreateRootFolder(drive);

  // Create client subfolder
  const folderName = companyName.trim().toUpperCase();
  const res = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootId],
    },
    fields: "id",
  });
  const folderId = res.data.id!;

  // Cache on client row
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

  // ── Google Drive ──────────────────────────────────────────────────────────
  if (!isGoogleWorkspaceConfigured()) {
    return NextResponse.json(
      { error: "Google Drive nie jest skonfigurowany. Skontaktuj się z Cosgral." },
      { status: 503 }
    );
  }

  const auth = getGoogleAuth()!;
  const drive = google.drive({ version: "v3", auth });
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

  const folderId = await ensureClientDriveFolder(drive, crm_client_id, companyName);

  // ── Resumable Upload Session URI ──────────────────────────────────────────
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
      body: JSON.stringify({ name: file_name, parents: [folderId] }),
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
