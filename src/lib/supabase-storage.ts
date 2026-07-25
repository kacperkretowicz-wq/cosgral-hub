import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/db";

const BUCKET = "client-materials";
const PREFIX = "supabase:";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export function isSupabaseStorageConfigured(): boolean {
  return isSupabaseConfigured();
}

export function toSupabaseFileId(storagePath: string): string {
  return `${PREFIX}${storagePath}`;
}

export function isSupabaseFileId(fileId: string): boolean {
  return fileId.startsWith(PREFIX);
}

function storagePathFromFileId(fileId: string): string {
  return fileId.slice(PREFIX.length);
}

export async function uploadFileToSupabaseStorage(
  clientId: string,
  sectionKey: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer,
): Promise<{ fileId: string }> {
  const safeName = fileName.replace(/[/\\?%*:|"<>]/g, "-");
  const storagePath = `${clientId}/${sectionKey}/${Date.now()}-${safeName}`;

  const supabase = getServiceClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(
      error.message.includes("Bucket not found")
        ? "Brak bucketu client-materials w Supabase — uruchom migrację 003_storage_bucket.sql"
        : error.message,
    );
  }

  return { fileId: toSupabaseFileId(storagePath) };
}

export async function getSupabaseFileSignedUrl(
  fileId: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  if (!isSupabaseFileId(fileId)) return null;

  const supabase = getServiceClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePathFromFileId(fileId), expiresInSeconds);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
