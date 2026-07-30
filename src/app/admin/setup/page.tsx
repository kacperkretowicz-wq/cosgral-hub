"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";

type Health = {
  ready?: boolean;
  missing?: string[];
  clients?: boolean;
  offer_document?: boolean;
  projects?: boolean;
  tasks?: boolean;
  leads?: boolean;
  billing?: boolean;
};

export default function SetupPage() {
  const [status, setStatus] = useState<{
    configured?: boolean;
    hasPublishable?: boolean;
    hasSecret?: boolean;
  } | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [dbPassword, setDbPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    users?: string[];
    tablesExist?: boolean;
    sqlRequired?: boolean;
    error?: string;
    applied?: string[];
    sql?: string;
    sqlEditorUrl?: string;
  } | null>(null);

  const refreshHealth = () => {
    fetch("/api/setup/migrate", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setHealth(data.health ?? null))
      .catch(() => {});
  };

  useEffect(() => {
    fetch("/api/setup/complete")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
    refreshHealth();
  }, []);

  const handleComplete = async () => {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/setup/complete", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    setResult(data);
  };

  const handleMigrate = async () => {
    setMigrating(true);
    setResult(null);
    const res = await fetch("/api/setup/migrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        dbPassword.trim() ? { db_password: dbPassword.trim() } : {},
      ),
    });
    const data = await res.json();
    setMigrating(false);
    setResult(data);
    if (data.health) setHealth(data.health);
    else refreshHealth();
  };

  const keysReady = status?.hasPublishable && status?.hasSecret;

  return (
    <PageShell logoHref="/admin" logoSize="lg">
      <div className="mx-auto max-w-2xl space-y-8 pt-8">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Setup Cosgral OS</h1>
          <p className="mt-2 text-sm text-white/60">
            Projekt: bduwbnnvhahtcjjxaazv.supabase.co
          </p>
        </div>

        <GlassCard title="Status kluczy">
          <ul className="space-y-2 text-sm">
            <li
              className={
                status?.hasPublishable ? "text-green-400" : "text-yellow-400"
              }
            >
              {status?.hasPublishable ? "✓" : "○"} Publishable key
            </li>
            <li
              className={status?.hasSecret ? "text-green-400" : "text-yellow-400"}
            >
              {status?.hasSecret ? "✓" : "○"} Secret key
            </li>
            <li
              className={
                status?.configured ? "text-green-400" : "text-white/50"
              }
            >
              {status?.configured ? "✓" : "○"} Supabase skonfigurowany
            </li>
          </ul>
        </GlassCard>

        <GlassCard title="Schema (tabele Cosgral OS)">
          {health ? (
            <ul className="space-y-1 text-sm">
              <li className={health.clients ? "text-green-400" : "text-red-300"}>
                {health.clients ? "✓" : "✗"} clients
              </li>
              <li
                className={
                  health.offer_document ? "text-green-400" : "text-red-300"
                }
              >
                {health.offer_document ? "✓" : "✗"} offer_document (oferty
                Cosgral)
              </li>
              <li
                className={health.projects ? "text-green-400" : "text-red-300"}
              >
                {health.projects ? "✓" : "✗"} projects
              </li>
              <li className={health.billing ? "text-green-400" : "text-red-300"}>
                {health.billing ? "✓" : "✗"} finanse zleceń
              </li>
              <li className={health.tasks ? "text-green-400" : "text-red-300"}>
                {health.tasks ? "✓" : "✗"} tasks (harmonogram)
              </li>
              <li className={health.leads ? "text-green-400" : "text-red-300"}>
                {health.leads ? "✓" : "✗"} leads
              </li>
            </ul>
          ) : (
            <p className="text-sm text-white/50">Sprawdzam…</p>
          )}

          {health && !health.ready && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-amber-200">
                Brakuje:{" "}
                {(health.missing ?? []).join(", ") || "elementów schematu"}
              </p>
              <label className="block text-sm text-white/70">
                Hasło bazy Supabase (Settings → Database → Database password)
              </label>
              <input
                type="password"
                value={dbPassword}
                onChange={(e) => setDbPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
              />
              <Button
                onClick={handleMigrate}
                disabled={migrating}
                className="w-full"
              >
                {migrating
                  ? "Uruchamiam migracje…"
                  : "Uruchom wszystkie migracje (001–008)"}
              </Button>
              <p className="text-xs text-white/40">
                Albo ustaw{" "}
                <code className="text-white/60">DATABASE_URL</code> w Netlify i
                kliknij bez hasła. SQL Editor:{" "}
                <a
                  href="https://supabase.com/dashboard/project/bduwbnnvhahtcjjxaazv/sql/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  otwórz
                </a>
                .
              </p>
            </div>
          )}

          {health?.ready && (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-green-300">
                Schema kompletna — Cosgral OS gotowy.
              </p>
              <details className="text-xs text-white/40">
                <summary className="cursor-pointer underline">
                  Uruchom migracje ponownie
                </summary>
                <div className="mt-3 space-y-2">
                  <input
                    type="password"
                    value={dbPassword}
                    onChange={(e) => setDbPassword(e.target.value)}
                    placeholder="Hasło bazy (opcjonalnie jeśli DATABASE_URL)"
                    className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
                  />
                  <Button
                    onClick={handleMigrate}
                    disabled={migrating}
                    className="w-full"
                  >
                    {migrating ? "Uruchamiam…" : "Re-run 001–008"}
                  </Button>
                </div>
              </details>
            </div>
          )}
        </GlassCard>

        {keysReady && (
          <GlassCard title="Konta admin">
            <p className="mb-4 text-sm text-white/60">
              Utwórz / sprawdź konta Jakub + Kacper.
            </p>
            <Button onClick={handleComplete} disabled={loading} className="w-full">
              {loading ? "Tworzę konta..." : "Utwórz konta admin"}
            </Button>
          </GlassCard>
        )}

        {result && (
          <GlassCard title={result.success || result.applied ? "✓ Wynik" : "Info"}>
            {result.error && (
              <p className="text-sm text-red-400 whitespace-pre-wrap">
                {typeof result.error === "string"
                  ? result.error
                  : JSON.stringify(result.error)}
              </p>
            )}
            {result.message && (
              <p className="text-sm text-green-300">{result.message}</p>
            )}
            {result.applied && (
              <ul className="mt-2 space-y-1 text-xs text-white/60">
                {result.applied.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
            )}
            {result.sql && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-white/50">
                  Wklej SQL ręcznie w{" "}
                  <a
                    href={
                      result.sqlEditorUrl ??
                      "https://supabase.com/dashboard/project/bduwbnnvhahtcjjxaazv/sql/new"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    SQL Editor
                  </a>
                  :
                </p>
                <textarea
                  readOnly
                  value={result.sql}
                  rows={10}
                  className="w-full rounded-sm border border-white/15 bg-black/40 p-2 font-mono text-[10px] text-white/70"
                  onFocus={(e) => e.target.select()}
                />
              </div>
            )}
            {result.users && (
              <ul className="mt-3 space-y-1 text-sm text-white/70">
                {result.users.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            )}
            {(health?.ready || result.tablesExist) && (
              <Link href="/admin">
                <Button className="mt-4">Przejdź do panelu →</Button>
              </Link>
            )}
          </GlassCard>
        )}

        {!keysReady && (
          <p className="text-center text-sm text-white/40">
            Uzupełnij klucze Supabase w Netlify /{" "}
            <code>.env.local</code> i zrestartuj.
          </p>
        )}
      </div>
    </PageShell>
  );
}
