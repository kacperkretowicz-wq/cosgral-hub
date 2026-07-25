import { createClientFolder } from "./google-drive";
import { createClientDoc, isDocsConfigured } from "./google-docs";
import type { Client } from "./types";

export { syncClientDoc } from "./google-docs";

export async function ensureClientWorkspace(
  client: Client,
): Promise<{
  drive_folder_id: string | null;
  drive_section_folders: Record<string, string>;
  drive_doc_id: string | null;
}> {
  let driveFolderId = client.drive_folder_id;
  let driveSectionFolders = client.drive_section_folders ?? {};
  let driveDocId = client.drive_doc_id ?? null;

  if (!isDocsConfigured()) {
    return {
      drive_folder_id: driveFolderId,
      drive_section_folders: driveSectionFolders,
      drive_doc_id: driveDocId,
    };
  }

  if (!driveFolderId || Object.keys(driveSectionFolders).length === 0) {
    const created = await createClientFolder(client.company_name);
    if (created) {
      driveFolderId = created.folderId;
      driveSectionFolders = created.sectionFolders;
    }
  }

  if (driveFolderId && !driveDocId) {
    driveDocId = await createClientDoc(client.company_name, driveFolderId);
  }

  return {
    drive_folder_id: driveFolderId,
    drive_section_folders: driveSectionFolders,
    drive_doc_id: driveDocId,
  };
}
