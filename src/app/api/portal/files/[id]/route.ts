import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { deletePortalFile } from "@/lib/portal-db";
import { createClient } from "@supabase/supabase-js";
import { getGoogleAuth, isGoogleWorkspaceConfigured } from "@/lib/google-auth";
import { google } from "googleapis";

const BUCKET = "client-materials";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  try {
    const { storage_path, gdrive_file_id } = await deletePortalFile(id);

    // Remove from Supabase storage (legacy files)
    if (storage_path) {
      await getServiceClient().storage.from(BUCKET).remove([storage_path]);
    }

    // Remove from Google Drive (new files)
    if (gdrive_file_id && isGoogleWorkspaceConfigured()) {
      try {
        const auth = getGoogleAuth()!;
        const drive = google.drive({ version: "v3", auth });
        await drive.files.delete({ fileId: gdrive_file_id });
      } catch (err) {
        // Non-fatal — DB record is already gone
        console.warn("[files/delete] Could not delete from Drive:", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
