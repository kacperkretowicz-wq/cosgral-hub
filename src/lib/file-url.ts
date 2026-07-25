import { getDriveFileUrl } from "@/lib/google-drive";
import {
  getSupabaseFileSignedUrl,
  isSupabaseFileId,
} from "@/lib/supabase-storage";

export async function getStoredFileUrl(
  driveFileId: string,
): Promise<string | null> {
  if (driveFileId.startsWith("local-")) return null;

  if (isSupabaseFileId(driveFileId)) {
    return getSupabaseFileSignedUrl(driveFileId);
  }

  return getDriveFileUrl(driveFileId);
}
