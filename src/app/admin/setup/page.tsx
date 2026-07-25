"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";

export default function SetupPage() {
  const [status, setStatus] = useState<{
    configured?: boolean;
    hasPublishable?: boolean;
    hasSecret?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    users?: string[];
    tablesExist?: boolean;
    sqlRequired?: boolean;
    error?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/setup/complete")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  const handleComplete = async () => {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/setup/complete", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    setResult(data);
  };

  const keysReady = status?.hasPublishable && status?.hasSecret;

  return (
    <PageShell logoHref="/admin" logoSize="lg">
      <div className="mx-auto max-w-2xl space-y-8 pt-8">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Setup Supabase</h1>
          <p className="mt-2 text-sm text-white/60">
            Projekt: bduwbnnvhahtcjjxaazv.supabase.co
          </p>
        </div>

        <GlassCard title="Status kluczy">
          <ul className="space-y-2 text-sm">
            <li className={status?.hasPublishable ? "text-green-400" : "text-yellow-400"}>
              {status?.hasPublishable ? "✓" : "○"} Publishable key (sb_publishable_...)
            </li>
            <li className={status?.hasSecret ? "text-green-400" : "text-yellow-400"}>
              {status?.hasSecret ? "✓" : "○"} Secret key (sb_secret_...)
            </li>
            <li className={status?.configured ? "text-green-400" : "text-white/50"}>
              {status?.configured ? "✓" : "○"} Supabase skonfigurowany
            </li>
          </ul>
        </GlassCard>

        {keysReady && (
          <GlassCard title="Krok 1 — Utwórz konta admin">
            <p className="mb-4 text-sm text-white/60">
              Klucze są w .env.local. Kliknij poniżej, aby utworzyć konta Jakub +
              Kacper.
            </p>
            <Button onClick={handleComplete} disabled={loading} className="w-full">
              {loading ? "Tworzę konta..." : "Utwórz konta admin"}
            </Button>
          </GlassCard>
        )}

        {result && (
          <GlassCard title={result.success ? "✓ Gotowe" : "✗ Błąd"}>
            {result.error && (
              <p className="text-sm text-red-400">{result.error}</p>
            )}
            {result.message && (
              <p className="text-sm text-green-300">{result.message}</p>
            )}
            {result.users && (
              <ul className="mt-3 space-y-1 text-sm text-white/70">
                {result.users.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            )}
            {result.sqlRequired && (
              <div className="mt-4 space-y-2 text-sm text-yellow-200">
                <p>
                  <strong>Krok 2 — Uruchom SQL</strong> (jednorazowo):
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-white/70">
                  <li>
                    Otwórz{" "}
                    <a
                      href="https://supabase.com/dashboard/project/bduwbnnvhahtcjjxaazv/sql/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      SQL Editor
                    </a>
                  </li>
                  <li>
                    Wklej zawartość pliku{" "}
                    <code>supabase/migrations/001_initial_schema.sql</code>
                  </li>
                  <li>Kliknij Run</li>
                </ol>
              </div>
            )}
            {result.tablesExist && (
              <Link href="/admin/login">
                <Button className="mt-4">Przejdź do logowania →</Button>
              </Link>
            )}
          </GlassCard>
        )}

        {!keysReady && (
          <p className="text-center text-sm text-white/40">
            Uzupełnij klucze w <code>.env.local</code> i zrestartuj serwer.
          </p>
        )}
      </div>
    </PageShell>
  );
}
