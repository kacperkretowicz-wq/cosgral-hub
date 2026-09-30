/**
 * gdrive-folders.ts
 * Shared Google Drive folder management — usable from API routes without circular deps.
 */

import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Get or auto-create the COSGRAL HUB root folder.
 *  Priority: 1) hub_settings cache  2) GOOGLE_DRIVE_ROOT_FOLDER_ID env  3) auto-create */
export async function getOrCreateRootFolder(
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
    try {
      await drive.files.get({ fileId: setting.value as string, fields: "id" });
      return setting.value as string;
    } catch { /* stale — fall through */ }
  }

  // 2. Try env var
  const envId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (envId) {
    try {
      await drive.files.get({ fileId: envId, fields: "id" });
      await supabase.from("hub_settings").upsert({ key: "gdrive_root_folder_id", value: envId });
      return envId;
    } catch { /* stale — fall through */ }
  }

  // 3. Auto-create "COSGRAL HUB" at Drive root
  const res = await drive.files.create({
    requestBody: { name: "COSGRAL HUB", mimeType: "application/vnd.google-apps.folder" },
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

  // Check cache
  const { data: client } = await supabase
    .from("crm_clients")
    .select("gdrive_portal_folder_id")
    .eq("id", crm_client_id)
    .single();

  if (client?.gdrive_portal_folder_id) {
    try {
      await drive.files.get({ fileId: client.gdrive_portal_folder_id as string, fields: "id" });
      return client.gdrive_portal_folder_id as string;
    } catch { /* stale — recreate */ }
  }

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
