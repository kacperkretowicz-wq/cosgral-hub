import { NextResponse } from "next/server";
import { google } from "googleapis";
import {
  createGoogleOAuth2Client,
  getGoogleAuth,
  isGoogleWorkspaceConfigured,
} from "@/lib/google-auth";
import { getOrCreateRootFolder, resetRootFolderCache } from "@/lib/gdrive-folders";

export async function GET() {
  const configured = isGoogleWorkspaceConfigured();

  if (!configured) {
    return NextResponse.json({
      ok: false,
      configured: false,
      missing: [
        !process.env.GOOGLE_CLIENT_ID && "GOOGLE_CLIENT_ID",
        !process.env.GOOGLE_CLIENT_SECRET && "GOOGLE_CLIENT_SECRET",
        !process.env.GOOGLE_REFRESH_TOKEN && "GOOGLE_REFRESH_TOKEN",
      ].filter(Boolean),
      authorize_url: createGoogleOAuth2Client()
        ? "/api/google/oauth/authorize"
        : null,
    });
  }

  try {
    const auth = getGoogleAuth();
    const drive = google.drive({ version: "v3", auth: auth! });

    // Get cached folder ID
    let rootId = await getOrCreateRootFolder(drive);

    // Status endpoint DOES verify — this is the one place we call Drive API
    // to confirm the folder is still alive. If stale, auto-heal.
    try {
      const folder = await drive.files.get({
        fileId: rootId,
        fields: "id,name,mimeType",
        supportsAllDrives: true,
      });

      return NextResponse.json({
        ok: true,
        configured: true,
        root_folder: { id: folder.data.id, name: folder.data.name },
      });
    } catch {
      // Folder is stale — reset cache and recreate
      await resetRootFolderCache();
      rootId = await getOrCreateRootFolder(drive);
      const folder = await drive.files.get({ fileId: rootId, fields: "id,name" });
      return NextResponse.json({
        ok: true,
        configured: true,
        healed: true,
        root_folder: { id: folder.data.id, name: folder.data.name },
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: false, configured: true, error: message, authorize_url: "/api/google/oauth/authorize" },
      { status: 503 },
    );
  }
}
