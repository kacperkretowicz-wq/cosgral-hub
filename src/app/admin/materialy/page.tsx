"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/ui/CrmUi";
import { Button } from "@/components/ui/Button";
import type { PortalClientSummary } from "@/lib/portal-db";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ClientCard({ c }: { c: PortalClientSummary }) {
  const [copied, setCopied] = useState(false);

  const portalUrl = c.portal_slug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/portal/${c.portal_slug}`
    : null;

  const copyLink = async () => {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="surface flex flex-col gap-4 p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-white">{c.company_name}</p>
          {c.contact_name && (
            <p className="mt-0.5 truncate text-xs text-white/50">{c.contact_name}</p>
          )}
        </div>
        {c.pending_requests > 0 && (
          <span className="shrink-0 rounded-full bg-amber-400/20 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-300">
            {c.pending_requests} oczek.
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/[0.04] px-3 py-2">
          <p className="text-lg font-light text-white">{c.file_count}</p>
          <p className="label-mono">Pliki</p>
        </div>
        <div className="rounded-xl bg-white/[0.04] px-3 py-2">
          <p className="text-xs text-white/70">{formatDate(c.last_activity)}</p>
          <p className="label-mono">Aktywność</p>
        </div>
      </div>

      {/* Portal link */}
      {c.portal_slug ? (
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-[0.65rem] text-white/40">
            /portal/{c.portal_slug}
          </span>
          <button
            type="button"
            onClick={copyLink}
            className="shrink-0 text-[0.65rem] font-medium text-white/60 hover:text-white"
          >
            {copied ? "✓ Skopiowano" : "Kopiuj"}
          </button>
        </div>
      ) : (
        <p className="text-[0.65rem] text-white/30 italic">Brak linku portalu</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href={`/admin/materialy/${c.id}`}
          className="flex-1 rounded-2xl bg-white/8 px-4 py-2 text-center text-xs font-medium text-white/80 hover:bg-white/12 transition-colors"
        >
          Otwórz katalog →
        </Link>
      </div>
    </div>
  );
}

export default function MaterialyPage() {
  const [clients, setClients] = useState<PortalClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/clients", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Błąd ładowania"); return; }
      setClients(data.clients ?? []);
    } catch {
      setError("Błąd sieci");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = clients.filter((c) =>
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact_name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const totalPending = clients.reduce((sum, c) => sum + c.pending_requests, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Cosgral"
        title="Materiały klientów"
        description="Wspólne katalogi plików — wideo, zdjęcia, notatki i czat z każdym klientem."
        actions={
          <div className="flex gap-2">
            <Button type="button" onClick={load}>
              Odśwież
            </Button>
          </div>
        }
      />

      {/* Pending requests banner */}
      {totalPending > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3">
          <span className="text-sm text-amber-200">
            🔑 {totalPending} {totalPending === 1 ? "klient prosi" : "klientów prosi"} o dostęp do portalu
          </span>
        </div>
      )}

      {/* Stats strip */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="surface p-4 text-center">
          <p className="text-2xl font-light text-white">{clients.length}</p>
          <p className="label-mono mt-1">Klientów</p>
        </div>
        <div className="surface p-4 text-center">
          <p className="text-2xl font-light text-white">
            {clients.reduce((s, c) => s + c.file_count, 0)}
          </p>
          <p className="label-mono mt-1">Plików łącznie</p>
        </div>
        <div className="surface p-4 text-center">
          <p className="text-2xl font-light text-amber-400">{totalPending}</p>
          <p className="label-mono mt-1">Oczekujących</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="search"
          placeholder="Szukaj klienta…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="glass-field w-full max-w-sm rounded-2xl px-4 py-2.5 text-sm"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
          <span className="label-mono ml-3">Ładowanie…</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Brak klientów"
          description="Dodaj klientów w zakładce Klienci, aby tutaj pojawily się ich katalogi materiałów."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <ClientCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
