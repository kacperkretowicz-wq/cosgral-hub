"use client";

import { useEffect, useRef, useState } from "react";
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

// ── Share modal ───────────────────────────────────────────────────────────

function ShareModal({
  client,
  onClose,
  onSlugGenerated,
}: {
  client: PortalClientSummary;
  onClose: () => void;
  onSlugGenerated: (slug: string) => void;
}) {
  const [slug, setSlug] = useState<string | null>(client.portal_slug);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://cosgralhub.netlify.app";
  const portalUrl = slug ? `${origin}/portal/${slug}` : null;

  // Generate slug if client doesn't have one yet
  const generate = async () => {
    setGenerating(true);
    const res = await fetch("/api/portal/generate-slug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crm_client_id: client.id }),
    });
    const data = await res.json();
    if (res.ok && data.slug) {
      setSlug(data.slug);
      onSlugGenerated(data.slug);
    }
    setGenerating(false);
  };

  // Auto-generate if no slug
  useEffect(() => {
    if (!slug) void generate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copyLink = async () => {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    inputRef.current?.select();
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-3xl border border-white/12 bg-[#111111] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/40">Udostępnij katalog</p>
            <h2 className="mt-1 text-lg font-medium text-white">{client.company_name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/40 hover:bg-white/8 hover:text-white"
          >
            ✕
          </button>
        </div>

        {generating || !slug ? (
          <div className="flex items-center justify-center gap-3 py-8">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
            <span className="text-sm text-white/50">Generuję link…</span>
          </div>
        ) : (
          <>
            {/* Instruction */}
            <p className="mb-4 text-sm text-white/55">
              Wyślij ten link klientowi — po kliknięciu będzie mógł poprosić o dostęp, a Ty
              zatwierdzisz go jednym kliknięciem.
            </p>

            {/* URL box */}
            <div className="mb-3 flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.05] pr-2 pl-4">
              <input
                ref={inputRef}
                type="text"
                readOnly
                value={portalUrl ?? ""}
                className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white/80 outline-none selection:bg-white/20"
                onClick={() => inputRef.current?.select()}
              />
              <button
                type="button"
                onClick={copyLink}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  copied
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-white/10 text-white hover:bg-white/18"
                }`}
              >
                {copied ? "✓ Skopiowano!" : "Kopiuj link"}
              </button>
            </div>

            {/* Open in new tab */}
            <a
              href={`/portal/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Podgląd portalu ↗
            </a>
          </>
        )}

        {/* Footer */}
        <div className="mt-5 border-t border-white/8 pt-4">
          <p className="text-[0.65rem] text-white/25">
            Klient otworzy link i poprosi o dostęp → dostaniesz powiadomienie → zatwierdzisz
            jednym kliknięciem w zakładce{" "}
            <Link href={`/admin/materialy/${client.id}`} className="underline hover:text-white/50">
              Dostęp
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Client card ───────────────────────────────────────────────────────────

function ClientCard({
  c,
  onShare,
}: {
  c: PortalClientSummary;
  onShare: (client: PortalClientSummary) => void;
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
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3">
          <span className="text-sm text-amber-200">
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
          description="Dodaj klientów w zakładce Klienci, aby tutaj pojawiły się ich katalogi materiałów."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <ClientCard
              key={c.id}
              c={c}
              onShare={(client) => setShareTarget(client)}
            />
          ))}
        </div>
      )}

      {/* Share modal */}
      {shareTarget && (
        <ShareModal
          client={shareTarget}
          onClose={() => setShareTarget(null)}
          onSlugGenerated={(slug) => handleSlugGenerated(shareTarget.id, slug)}
        />
      )}
    </div>
  );
}
