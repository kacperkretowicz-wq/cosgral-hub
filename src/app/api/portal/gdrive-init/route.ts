/**
 * POST /api/portal/gdrive-init
 * Returns a Google Drive Resumable Upload Session URI.
 * The browser then PUTs the file directly to Google — bypassing Netlify size limits.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { validatePortalSession } from "@/lib/portal-db";
import { getGoogleAuth, isGoogleWorkspaceConfigured } from "@/lib/google-auth";
import { ensureClientDriveFolder } from "@/lib/gdrive-folders";
import { google } from "googleapis";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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

  if (!isGoogleWorkspaceConfigured()) {
    return NextResponse.json(
      { error: "Google Drive nie jest skonfigurowany." },
      { status: 503 }
    );
  }

  const auth = getGoogleAuth()!;
  const drive = google.drive({ version: "v3", auth });
  const { token: accessToken } = await auth.getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Brak tokenu Google" }, { status: 503 });
  }

  // Get company name for folder
  const supabase = db();
  const { data: clientRow } = await supabase
    .from("crm_clients")
    .select("company_name")
    .eq("id", crm_client_id)
    .single();
  const companyName = (clientRow?.company_name as string | null) ?? "Klient";

  // Ensure client folder exists (auto-creates root + client folder if needed)
  const folderId = await ensureClientDriveFolder(drive, crm_client_id, companyName);

  // ── Resumable Upload Session URI ──────────────────────────────────────────
  // Pass the browser's Origin so Google sets correct CORS headers on the
  // session URI — without this the browser XHR PUT gets a CORS error.
  const browserOrigin =
    request.headers.get("origin") ??
    request.headers.get("referer")?.split("/").slice(0, 3).join("/") ??
    "https://cosgralhub.netlify.app";

  const initRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mime_type || "application/octet-stream",
        "X-Upload-Content-Length": String(size_bytes ?? 0),
        "Origin": browserOrigin,
      },
      body: JSON.stringify({ name: file_name, parents: [folderId] }),
    }
  );

  if (!initRes.ok) {
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
