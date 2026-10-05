"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type ShareTab = "agency" | "client";

interface CatalogShareModalProps {
  crmClientId: string;
  companyName: string;
  portalSlug: string | null;
  onClose: () => void;
  onSlugGenerated?: (slug: string) => void;
}

export function CatalogShareModal({
  crmClientId,
  companyName,
  portalSlug: initialSlug,
  onClose,
  onSlugGenerated,
}: CatalogShareModalProps) {
  const [tab, setTab] = useState<ShareTab>("agency");
  const [slug, setSlug] = useState<string | null>(initialSlug);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<ShareTab | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://cosgralhub.netlify.app";

  const agencyUrl = `${origin}/admin/materialy/${crmClientId}`;
  const clientUrl = slug ? `${origin}/portal/${slug}` : null;

  useEffect(() => {
    setSlug(initialSlug);
  }, [initialSlug]);

  const ensureClientSlug = async () => {
    if (slug) return slug;
    setGenerating(true);
    const res = await fetch("/api/portal/generate-slug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crm_client_id: crmClientId }),
    });
    const data = await res.json();
    setGenerating(false);
    if (res.ok && data.slug) {
      setSlug(data.slug);
      onSlugGenerated?.(data.slug);
      return data.slug as string;
    }
    return null;
  };

  useEffect(() => {
    if (tab === "client" && !slug && !generating) {
      void ensureClientSlug();
    }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = async (which: ShareTab, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(which);
    inputRef.current?.select();
    setTimeout(() => setCopied(null), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-3xl border border-white/12 bg-[#111111] p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/40">
              Udostępnij katalog
            </p>
            <h2 className="mt-1 text-lg font-medium text-white">{companyName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/40 hover:bg-white/8 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mb-5 flex gap-1 rounded-2xl bg-white/[0.04] p-1">
          <button
            type="button"
            onClick={() => setTab("agency")}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              tab === "agency"
                ? "bg-white/12 text-white"
                : "text-white/45 hover:text-white/70"
            }`}
          >
            Wewnątrz agencji
          </button>
          <button
            type="button"
            onClick={() => setTab("client")}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              tab === "client"
                ? "bg-white/12 text-white"
                : "text-white/45 hover:text-white/70"
            }`}
          >
            Dla klienta
          </button>
        </div>

        {tab === "agency" ? (
          <>
            <p className="mb-4 text-sm text-white/55">
              Link dla Kacpra i zespołu — ten sam widok katalogu co u Ciebie w
              panelu admina (wymaga logowania do Cosgral Hub).
            </p>
            <UrlRow
              inputRef={inputRef}
              url={agencyUrl}
              copied={copied === "agency"}
              onCopy={() => void copy("agency", agencyUrl)}
            />
            <Link
              href={`/admin/materialy/${crmClientId}`}
              className="mt-3 block text-center text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Otwórz katalog w panelu ↗
            </Link>
          </>
        ) : generating || !clientUrl ? (
          <div className="flex items-center justify-center gap-3 py-8">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
            <span className="text-sm text-white/50">Generuję link dla klienta…</span>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-white/55">
              Wyślij ten link klientowi. Po wejściu może założyć konto w portalu
              i przeglądać lub dodawać materiały (zatwierdzasz dostęp w zakładce
              Dostęp).
            </p>
            <UrlRow
              inputRef={inputRef}
              url={clientUrl}
              copied={copied === "client"}
              onCopy={() => void copy("client", clientUrl)}
            />
            <a
              href={`/portal/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block text-center text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Podgląd portalu klienta ↗
            </a>
          </>
        )}

        <div className="mt-5 border-t border-white/8 pt-4">
          <p className="text-[0.65rem] text-white/25">
            {tab === "agency"
              ? "Ten link nie wysyła klientowi — służy tylko zespołowi z uprawnieniami admina."
              : "Nie udostępniaj linku agencji klientom — zawiera panel administracyjny."}
          </p>
        </div>
      </div>
    </div>
  );
}

function UrlRow({
  inputRef,
  url,
  copied,
  onCopy,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  url: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.05] pr-2 pl-4">
      <input
        ref={inputRef}
        type="text"
        readOnly
        value={url}
        className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white/80 outline-none selection:bg-white/20"
        onClick={() => inputRef.current?.select()}
      />
      <button
        type="button"
        onClick={onCopy}
        className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
          copied
            ? "bg-emerald-500/20 text-emerald-300"
            : "bg-white/10 text-white hover:bg-white/18"
        }`}
      >
        {copied ? "✓ Skopiowano!" : "Kopiuj link"}
      </button>
    </div>
  );
}
