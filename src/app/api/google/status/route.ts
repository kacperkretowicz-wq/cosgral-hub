import { NextResponse } from "next/server";
import { google } from "googleapis";
import {
  createGoogleOAuth2Client,
  getGoogleAuth,
  isGoogleWorkspaceConfigured,
} from "@/lib/google-auth";
import { getOrCreateRootFolder } from "@/lib/gdrive-folders";

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

    // Use self-healing logic — auto-fixes stale GOOGLE_DRIVE_ROOT_FOLDER_ID
    const rootId = await getOrCreateRootFolder(drive);

    const folder = await drive.files.get({
      fileId: rootId,
      fields: "id,name,mimeType",
      supportsAllDrives: true,
    });

    return NextResponse.json({
      ok: true,
      configured: true,
      root_folder: {
        id: folder.data.id,
        name: folder.data.name,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        error: message,
        authorize_url: "/api/google/oauth/authorize",
      },
      { status: 503 },
    );
  }
}
