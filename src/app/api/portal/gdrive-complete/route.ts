/**
 * POST /api/portal/gdrive-complete
 *
 * Called by the browser after a successful direct-to-Google-Drive upload.
 * Receives the Google Drive fileId, makes the file readable (viewer permission),
 * and saves a lightweight record in Supabase portal_files.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { validatePortalSession, createPortalFile } from "@/lib/portal-db";
import { getGoogleAuth, isGoogleWorkspaceConfigured } from "@/lib/google-auth";
import { google } from "googleapis";
import { cookies } from "next/headers";

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
    gdrive_file_id: string;
    gdrive_folder_id: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
    crm_client_id: string;
  };

  const { gdrive_file_id, gdrive_folder_id, file_name, mime_type, size_bytes } = body;
  const crm_client_id = body.crm_client_id ?? crm_client_id_from_session;

  if (!gdrive_file_id || !crm_client_id || !file_name) {
    return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
  }
  if (caller.sender === "client" && crm_client_id_from_session !== crm_client_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // ── Make file viewable (anyone with link) ──────────────────────────────────
  // This enables thumbnail/embed preview without the client needing a Google account.
  if (isGoogleWorkspaceConfigured()) {
    try {
      const auth = getGoogleAuth()!;
      const drive = google.drive({ version: "v3", auth });
      await drive.permissions.create({
        fileId: gdrive_file_id,
        requestBody: { role: "reader", type: "anyone" },
      });
    } catch (err) {
      // Non-fatal — file is still saved, just not publicly previewable
      console.warn("[gdrive-complete] Could not set public permission:", err);
    }
  }

  // ── Build preview/download URLs ───────────────────────────────────────────
  // Google Drive provides reliable thumbnail and embed URLs by file ID.
  const isVideoMime = mime_type?.startsWith("video/");
  const isImageMime = mime_type?.startsWith("image/");

  // Thumbnail works for images; for video we use a Drive preview embed
  const thumbnailUrl = isImageMime
    ? `https://drive.google.com/thumbnail?id=${gdrive_file_id}&sz=w400`
    : isVideoMime
    ? `https://drive.google.com/thumbnail?id=${gdrive_file_id}&sz=w400`
    : null;

  // Direct view link (opens in Drive viewer — branded as ours via iframe)
  const viewUrl = `https://drive.google.com/file/d/${gdrive_file_id}/view`;
  // Embeddable preview (for video player in our portal)
  const embedUrl = `https://drive.google.com/file/d/${gdrive_file_id}/preview`;

  // public_url → embed URL for video/image preview; download link otherwise
  const publicUrl = isVideoMime || isImageMime ? embedUrl : viewUrl;

  // ── Save to Supabase ──────────────────────────────────────────────────────
  const portalFile = await createPortalFile({
    crm_client_id,
    file_name,
    mime_type: mime_type || "application/octet-stream",
    storage_path: "",          // not used for gdrive files
    public_url: publicUrl,
    uploaded_by: caller.sender,
    uploader_name: caller.name,
    size_bytes: size_bytes ?? 0,
    gdrive_file_id,
    gdrive_folder_id: gdrive_folder_id ?? null,
    storage_provider: "gdrive",
  });

  return NextResponse.json({
    file: portalFile,
    view_url: viewUrl,
    embed_url: embedUrl,
    thumbnail_url: thumbnailUrl,
  });
}
