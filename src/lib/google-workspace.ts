import type { Client } from "./types";

export { syncClientDoc } from "./google-docs";

/**
 * Returns the client's existing Drive workspace.
 * Does NOT auto-create folders or Docs — folder must be pasted in the generator.
 */
export async function ensureClientWorkspace(
  client: Client,
): Promise<{
  drive_folder_id: string | null;
  drive_section_folders: Record<string, string>;
  drive_doc_id: string | null;
}> {
  return {
    drive_folder_id: client.drive_folder_id,
    drive_section_folders: client.drive_section_folders ?? {},
    drive_doc_id: client.drive_doc_id ?? null,
  };
}
