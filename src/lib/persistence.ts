import { isSupabaseConfigured } from "@/lib/db";

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
 * ERP data must live in Supabase on production hosts.
 * Local JSON is only for local development.
 */
export function assertPersistentDb(action = "zapis danych"): void {
  if (isSupabaseConfigured()) return;
  if (!isEphemeralHost()) return;

  throw new Error(
    `Nie można wykonać: ${action}. Supabase nie jest poprawnie skonfigurowane na serwerze ` +
      `(sprawdź NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY i SUPABASE_SERVICE_ROLE_KEY). ` +
      `Bez tego zlecenia i klienci nie zapisują się trwale (tryb lokalny na Netlify/Vercel).`,
  );
}

export function getDbMode(): "supabase" | "local" {
  return isSupabaseConfigured() ? "supabase" : "local";
}
