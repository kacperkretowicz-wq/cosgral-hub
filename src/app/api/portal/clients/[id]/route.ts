import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { listPortalFiles } from "@/lib/portal-db";
import { createClient } from "@supabase/supabase-js";
import { getGoogleAuth, isGoogleWorkspaceConfigured } from "@/lib/google-auth";
import { google } from "googleapis";

const BUCKET = "client-materials";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * DELETE /api/portal/clients/[id]
 *
 * Deletes an entire client materials catalog:
 *  1. All files in Google Drive (individual file IDs + root folder)
 *  2. All files in Supabase Storage (legacy)
 *  3. All DB rows: portal_files, portal_notes, portal_messages, portal_access_requests
 *
 * Does NOT delete the crm_clients row — that stays in the CRM.
 * Pass ?delete_crm=1 to also hard-delete the CRM client record.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id: clientId } = await params;
  const { searchParams } = new URL(request.url);
  const deleteCrm = searchParams.get("delete_crm") === "1";

  const db = serviceClient();
  const errors: string[] = [];

  // ── 1. Load all files ──────────────────────────────────────────────────────
  let files: Awaited<ReturnType<typeof listPortalFiles>> = [];
  try {
    files = await listPortalFiles(clientId);
  } catch (err) {
    errors.push(`load_files: ${String(err)}`);
  }

  // ── 2. Delete from Google Drive ────────────────────────────────────────────
  if (isGoogleWorkspaceConfigured()) {
    try {
      const gAuth = getGoogleAuth()!;
      const drive = google.drive({ version: "v3", auth: gAuth });

      // Collect unique folder IDs to delete the whole folder at once later
      const folderIds = new Set<string>();

      for (const file of files) {
        if (file.gdrive_file_id) {
          try {
            await drive.files.delete({ fileId: file.gdrive_file_id });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            if (!msg.includes("File not found")) {
              errors.push(`gdrive_file_${file.gdrive_file_id}: ${msg}`);
            }
          }
        }
        if (file.gdrive_folder_id) folderIds.add(file.gdrive_folder_id);
      }

      // Also try to delete the client sub-folder in Drive (removes leftovers)
      for (const folderId of folderIds) {
        try {
          await drive.files.delete({ fileId: folderId });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (!msg.includes("File not found")) {
            errors.push(`gdrive_folder_${folderId}: ${msg}`);
          }
        }
      }

      // Also check crm_clients.gdrive_portal_folder_id
      const { data: clientRow } = await db
        .from("crm_clients")
        .select("gdrive_portal_folder_id")
        .eq("id", clientId)
        .single();
      const rootFolderId = clientRow?.gdrive_portal_folder_id as string | null;
      if (rootFolderId && !folderIds.has(rootFolderId)) {
        try {
          await drive.files.delete({ fileId: rootFolderId });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (!msg.includes("File not found")) {
            errors.push(`gdrive_root_folder_${rootFolderId}: ${msg}`);
          }
        }
      }
    } catch (err) {
      errors.push(`gdrive_auth: ${String(err)}`);
    }
  }

  // ── 3. Delete from Supabase Storage (legacy) ──────────────────────────────
  const storagePaths = files
    .map((f) => f.storage_path)
    .filter((p): p is string => Boolean(p));
  if (storagePaths.length > 0) {
    const { error } = await db.storage.from(BUCKET).remove(storagePaths);
    if (error) errors.push(`storage: ${error.message}`);
  }

  // ── 4. Delete DB records ───────────────────────────────────────────────────
  const tables = [
    "portal_files",
    "portal_notes",
    "portal_messages",
    "portal_access_requests",
  ] as const;
  for (const table of tables) {
    const { error } = await db.from(table).delete().eq("crm_client_id", clientId);
    if (error) errors.push(`${table}: ${error.message}`);
  }

  // Clear Drive folder ref on the client row
  await db
    .from("crm_clients")
    .update({ gdrive_portal_folder_id: null })
    .eq("id", clientId);

  // ── 5. Optionally delete the CRM client record ────────────────────────────
  if (deleteCrm) {
    const { error } = await db.from("crm_clients").delete().eq("id", clientId);
    if (error) errors.push(`crm_clients: ${error.message}`);
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { ok: false, deleted: true, warnings: errors },
      { status: 207 },
    );
  }
  return NextResponse.json({ ok: true });
}
