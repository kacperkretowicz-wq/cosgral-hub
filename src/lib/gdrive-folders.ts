/**
 * gdrive-folders.ts
 * Shared Google Drive folder management — usable from API routes without circular deps.
 *
 * PERFORMANCE: Cached folder IDs are returned immediately without Drive API verification.
 * Drive API is only called to CREATE folders (first time or after explicit reset).
 * This removes ~600ms of unnecessary latency per upload.
 */

import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Get or auto-create the COSGRAL HUB root folder.
 * Fast path: returns cached ID from hub_settings without a Drive API call.
 * Only calls Drive API when no cached ID exists.
 */
export async function getOrCreateRootFolder(
  drive: ReturnType<typeof google.drive>
): Promise<string> {
  const supabase = db();

  // 1. Fast path — use Supabase-cached ID directly (no Drive API verification)
  const { data: setting } = await supabase
    .from("hub_settings")
    .select("value")
    .eq("key", "gdrive_root_folder_id")
    .single();

  if (setting?.value) {
    return setting.value as string;
  }

  // 2. Try env var and cache it
  const envId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (envId) {
    await supabase.from("hub_settings").upsert({ key: "gdrive_root_folder_id", value: envId });
    return envId;
  }

  // 3. Create "COSGRAL HUB" at Drive root (only runs once ever)
  const res = await drive.files.create({
    requestBody: { name: "COSGRAL HUB", mimeType: "application/vnd.google-apps.folder" },
    fields: "id",
  });
  const newId = res.data.id!;
  await supabase.from("hub_settings").upsert({ key: "gdrive_root_folder_id", value: newId });
  return newId;
}

/**
 * Ensure a per-client subfolder exists under the root. Returns folder ID.
 * Fast path: returns cached ID from crm_clients without a Drive API call.
 * Only calls Drive API when no cached ID exists.
 */
export async function ensureClientDriveFolder(
  drive: ReturnType<typeof google.drive>,
  crm_client_id: string,
  companyName: string
): Promise<string> {
  const supabase = db();

  // Fast path — use cached folder ID directly (no Drive API verification)
  const { data: client } = await supabase
    .from("crm_clients")
    .select("gdrive_portal_folder_id")
    .eq("id", crm_client_id)
    .single();

  if (client?.gdrive_portal_folder_id) {
    return client.gdrive_portal_folder_id as string;
  }

  // Create client folder (only runs on first upload per client)
  const rootId = await getOrCreateRootFolder(drive);

  const res = await drive.files.create({
    requestBody: {
      name: companyName.trim().toUpperCase(),
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootId],
    },
    fields: "id",
  });
  const folderId = res.data.id!;

  await supabase
    .from("crm_clients")
    .update({ gdrive_portal_folder_id: folderId })
    .eq("id", crm_client_id);

  return folderId;
}

/**
 * Force-reset the cached root folder ID (call when folder is known to be stale).
 * Used by /api/google/status self-healing.
 */
export async function resetRootFolderCache(newId?: string): Promise<void> {
  const supabase = db();
  if (newId) {
    await supabase.from("hub_settings").upsert({ key: "gdrive_root_folder_id", value: newId });
  } else {
    await supabase.from("hub_settings").delete().eq("key", "gdrive_root_folder_id");
  }
}
