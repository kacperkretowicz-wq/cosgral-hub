import { isSupabaseConfigured } from "@/lib/db";
import { isBlobsDbEnabled } from "@/lib/json-store";

/** True on Netlify / Vercel / other serverless hosts where local JSON is ephemeral. */
export function isEphemeralHost(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.NETLIFY) ||
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
  );
}

/**
 * ERP data must live in Supabase or Netlify Blobs on production hosts.
 * Plain local JSON files are only for local development.
 */
export function assertPersistentDb(action = "zapis danych"): void {
  if (isSupabaseConfigured()) return;
  if (isBlobsDbEnabled()) return;
  if (!isEphemeralHost()) return;

  throw new Error(
    `Nie można wykonać: ${action}. Ustaw COSGRAL_DB_MODE=blobs albo skonfiguruj Supabase ` +
      `(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).`,
  );
}

export function getDbMode(): "supabase" | "blobs" | "local" {
  if (isSupabaseConfigured()) return "supabase";
  if (isBlobsDbEnabled()) return "blobs";
  return "local";
}
