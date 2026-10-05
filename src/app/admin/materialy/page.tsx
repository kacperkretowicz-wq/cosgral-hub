"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/ui/CrmUi";
import { Button } from "@/components/ui/Button";
import type { PortalClientSummary } from "@/lib/portal-db";
import { CatalogShareModal } from "@/components/CatalogShareModal";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Delete Modal ──────────────────────────────────────────────────────────

function DeleteCatalogModal({
  client,
  onClose,
  onDeleted,
}: {
  client: PortalClientSummary;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [phase, setPhase] = useState<"confirm" | "deleting" | "done" | "error">("confirm");
  const [errorMsg, setErrorMsg] = useState("");

  const handleDelete = async () => {
    setPhase("deleting");
    try {
      const res = await fetch(`/api/portal/clients/${client.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 207) {
        setErrorMsg(data.error ?? "Błąd usuwania");
        setPhase("error");
        return;
      }
      setPhase("done");
      setTimeout(() => {
        onDeleted(client.id);
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(String(err));
      setPhase("error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={(e) => phase !== "deleting" && e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-[#111111] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-red-400/70">Usuń katalog</p>
            <h2 className="mt-1 text-lg font-medium text-white">{client.company_name}</h2>
          </div>
          {phase !== "deleting" && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-white/40 hover:bg-white/8 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {phase === "confirm" && (
          <>
            <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3">
              <p className="text-sm text-red-200 font-medium mb-1">Czy na pewno chcesz usunąć katalog?</p>
              <p className="text-xs text-white/50 leading-relaxed">
                Zostaną trwale usunięte:
              </p>
              <ul className="mt-2 space-y-1 text-xs text-white/45">
                <li>• Wszystkie pliki z katalogu klienta</li>
                <li>• Folder <span className="font-mono text-white/65">Cosgral HUB / {client.company_name}</span></li>
                <li>• Wszystkie pliki, notatki i wiadomości w systemie</li>
                <li>• Historia dostępu do portalu</li>
              </ul>
              <p className="mt-3 text-xs text-white/35">
                Karta klienta w zakładce Klienci <span className="text-white/55">nie</span> zostanie usunięta.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-white/12 px-4 py-2.5 text-sm text-white/60 hover:border-white/25 hover:text-white/90 transition-colors"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 rounded-2xl bg-red-500/20 border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/30 transition-colors"
              >
                Usuń katalog
              </button>
            </div>
          </>
        )}

        {phase === "deleting" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500/30 border-t-red-400" />
            <div className="text-center">
              <p className="text-sm text-white/70 font-medium">Usuwam katalog…</p>
              <p className="text-xs text-white/35 mt-1">Usuwam pliki i dane klienta</p>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-2xl">
              ✓
            </div>
            <p className="text-sm font-medium text-emerald-300">Katalog usunięty</p>
          </div>
        )}

        {phase === "error" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="text-sm text-red-300 font-medium">Błąd usuwania</p>
              <p className="mt-1 text-xs text-red-300/70">{errorMsg}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl border border-white/12 px-4 py-2.5 text-sm text-white/60 hover:text-white/90 transition-colors"
            >
              Zamknij
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Client card ───────────────────────────────────────────────────────────

function ClientCard({
  c,
  onShare,
  onDelete,
}: {
  c: PortalClientSummary;
  onShare: (client: PortalClientSummary) => void;
  onDelete: (client: PortalClientSummary) => void;
}) {
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
        <div className="flex items-center gap-2">
          {c.pending_requests > 0 && (
            <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[0.65rem] font-semibold text-white/70">
              {c.pending_requests} oczek.
            </span>
          )}
          {/* Delete button */}
          <button
            type="button"
            onClick={() => onDelete(c)}
            title="Usuń katalog"
            className="rounded-full p-1.5 text-white/25 hover:bg-red-500/15 hover:text-red-400 transition-colors"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
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

      {/* Actions */}
      <div className="flex gap-2">
        {/* PRIMARY: Udostępnij */}
        <button
          type="button"
          onClick={() => onShare(c)}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/15 transition-colors"
        >
          <svg
            className="h-3.5 w-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Udostępnij
        </button>

        {/* SECONDARY: Otwórz katalog */}
        <Link
          href={`/admin/materialy/${c.id}`}
          className="flex items-center justify-center rounded-2xl border border-white/12 px-4 py-2.5 text-sm text-white/60 hover:border-white/25 hover:text-white/90 transition-colors"
        >
          Katalog →
        </Link>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function MaterialyPage() {
  const [clients, setClients] = useState<PortalClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [shareTarget, setShareTarget] = useState<PortalClientSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PortalClientSummary | null>(null);

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

  // When modal generates a new slug — update the local list without refetch
  const handleSlugGenerated = (clientId: string, slug: string) => {
    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, portal_slug: slug } : c)),
    );
    if (shareTarget?.id === clientId) {
      setShareTarget((prev) => prev ? { ...prev, portal_slug: slug } : prev);
    }
  };

  // When a catalog is deleted — remove from local list
  const handleDeleted = (clientId: string) => {
    setClients((prev) => prev.filter((c) => c.id !== clientId));
  };

  return (
    <div>
      <PageHeader
        eyebrow="Cosgral"
        title="Materiały klientów"
        description="Wspólne katalogi plików — wideo, zdjęcia, notatki i czat z każdym klientem."
        actions={
          <Button type="button" onClick={load}>
            Odśwież
          </Button>
        }
      />

      {/* Pending requests banner */}
      {totalPending > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3">
          <span className="text-sm text-white/70">
            🔑 {totalPending} {totalPending === 1 ? "klient prosi" : "klientów prosi"} o dostęp — otwórz jego katalog aby zatwierdzić
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
          <p className="text-2xl font-light text-white">{totalPending}</p>
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
          description="Dodaj klientów w zakładce Klienci, aby tutaj pojawiły się ich katalogi materiałów."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <ClientCard
              key={c.id}
              c={c}
              onShare={(client) => setShareTarget(client)}
              onDelete={(client) => setDeleteTarget(client)}
            />
          ))}
        </div>
      )}

      {/* Share modal */}
      {shareTarget && (
        <CatalogShareModal
          crmClientId={shareTarget.id}
          companyName={shareTarget.company_name}
          portalSlug={shareTarget.portal_slug}
          onClose={() => setShareTarget(null)}
          onSlugGenerated={(slug) => handleSlugGenerated(shareTarget.id, slug)}
        />
      )}

      {/* Delete catalog confirmation modal */}
      {deleteTarget && (
        <DeleteCatalogModal
          client={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
