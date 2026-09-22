import Link from "next/link";
import { getDbMode } from "@/lib/persistence";
import { isSupabaseConfigured } from "@/lib/db";

export function DbStatusBanner() {
  const mode = getDbMode();
  const supabase = isSupabaseConfigured();

  if (supabase) {
    return (
      <div className="mb-6 rounded-2xl border border-[var(--accent)]/35 bg-[var(--accent-soft)] px-4 py-3 text-sm text-white">
        Połączono z <strong>Supabase</strong> — dane produkcyjne.
      </div>
    );
  }

  if (mode === "blobs") {
    return (
      <div className="mb-6 rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-white/85">
        Tryb <strong>Netlify Blobs</strong> — dane z hostingu.
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
      <p className="font-medium">Tryb lokalny — Supabase niepodłączony</p>
      <p className="mt-1 text-amber-100/75">
        Dane demo z <code className="rounded bg-black/30 px-1">/data</code>. Klucze w{" "}
        <code className="rounded bg-black/30 px-1">.env.local</code>, usuń{" "}
        <code className="rounded bg-black/30 px-1">COSGRAL_DB_MODE=local</code> albo{" "}
        <Link href="/admin/setup" className="underline underline-offset-2">
          /admin/setup
        </Link>
        .
      </p>
    </div>
  );
}
