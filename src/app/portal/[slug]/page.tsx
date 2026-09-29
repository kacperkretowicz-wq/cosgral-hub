"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { PortalFile, PortalNote, PortalMessage } from "@/lib/portal-db";

// ── tiny helpers ──────────────────────────────────────────────────────────

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pl-PL", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}
function isImage(m: string) { return m.startsWith("image/"); }
function isVideo(m: string) { return m.startsWith("video/"); }

// ── BrandHeader ───────────────────────────────────────────────────────────

function BrandHeader({ companyName }: { companyName: string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-white/8 bg-[#0A0A0A]/90 px-6 py-4 backdrop-blur-xl">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
        <span className="text-xs font-bold text-white/80">C</span>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Cosgral</p>
        <p className="text-sm font-medium text-white">{companyName}</p>
      </div>
    </header>
  );
}

// ── RequestAccessView ─────────────────────────────────────────────────────

function RequestAccessView({
  slug,
  companyName,
  onRequested,
}: {
  slug: string;
  companyName: string;
  onRequested: (requestId: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim()) { setError("Podaj imię"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/portal/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, requester_name: name.trim(), requester_email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Błąd"); return; }
      onRequested(data.request_id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/30">Cosgral</p>
          <h1 className="mt-3 text-2xl font-light text-[#F5F3EE]">Katalog materiałów</h1>
          <p className="mt-1 text-sm text-white/45">{companyName}</p>
        </div>

        {/* Form */}
        <div className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-widest text-white/40">Twoje imię *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Jan Kowalski"
              className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-[#F5F3EE] placeholder-white/25 focus:border-white/30 focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && void submit()}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-widest text-white/40">Email (opcjonalnie)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jan@firma.pl"
              className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-[#F5F3EE] placeholder-white/25 focus:border-white/30 focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && void submit()}
            />
          </div>

          {error && <p className="text-xs text-red-300">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="w-full rounded-2xl bg-[#F5F3EE] px-6 py-3 text-sm font-semibold text-[#0A0A0A] hover:bg-white disabled:opacity-50 transition-opacity"
          >
            {submitting ? "Wysyłam prośbę…" : "Poproś o dostęp"}
          </button>
        </div>

        <p className="text-center text-xs text-white/25">
          Cosgral otrzyma powiadomienie i zatwierdzi dostęp.
        </p>
      </div>
    </main>
  );
}

// ── WaitingView ───────────────────────────────────────────────────────────

function WaitingView({
  requestId,
  onApproved,
}: {
  requestId: string;
  onApproved: (token: string) => void;
}) {
  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch(`/api/portal/approve/${requestId}`);
      const data = await res.json();
      if (data.status === "approved" && data.token) {
        // Set session cookie via a fetch call that returns Set-Cookie
        // (the GET endpoint just returns status — we call POST approve with admin session
        // from HUB; but here client just needs to store the token themselves)
        // Store token in a non-httpOnly cookie (client-side) for the portal page to read.
        document.cookie = `portal_session=${data.token};path=/;max-age=${60 * 60 * 24 * 30};samesite=lax`;
        onApproved(data.token);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [requestId, onApproved]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-6 py-16">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
        <div>
          <h2 className="text-xl font-light text-[#F5F3EE]">Prośba wysłana</h2>
          <p className="mt-2 text-sm text-white/40">
            Cosgral otrzymał powiadomienie. Zaraz po zatwierdzeniu zostaniesz automatycznie przekierowany.
          </p>
        </div>
        <p className="text-xs text-white/25">Możesz zostawić tę kartę otwartą.</p>
      </div>
    </main>
  );
}

// ── PortalDashboard ───────────────────────────────────────────────────────

type PortalTab = "pliki" | "notatki" | "czat";

function PortalDashboard({
  companyName,
  crm_client_id,
  callerName,
}: {
  companyName: string;
  crm_client_id: string;
  callerName: string;
}) {
  const [files, setFiles] = useState<PortalFile[]>([]);
  const [notes, setNotes] = useState<PortalNote[]>([]);
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [tab, setTab] = useState<PortalTab>("pliki");
  const [noteText, setNoteText] = useState("");
  const [chatText, setChatText] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/portal/chat?crm_client_id=${crm_client_id}`);
    const chatData = await res.json();
    setMessages(chatData.messages ?? []);

    const nRes = await fetch(`/api/portal/notes?crm_client_id=${crm_client_id}`);
    const nData = await nRes.json();
    setNotes(nData.notes ?? []);
  }, [crm_client_id]);

  const loadFiles = useCallback(async () => {
    const res = await fetch(`/api/portal/${window.location.pathname.split("/portal/")[1]}`, { cache: "no-store" });
    const data = await res.json();
    setFiles(data.files ?? []);
    setNotes(data.notes ?? []);
    setMessages(data.messages ?? []);
  }, []);

  useEffect(() => { void loadFiles(); }, [loadFiles]);

  // Poll chat every 8s
  useEffect(() => {
    if (tab !== "czat") return;
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [tab, load]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    setBusy(true);
    for (const file of Array.from(fileList)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("crm_client_id", crm_client_id);
      await fetch("/api/portal/upload", { method: "POST", body: fd });
    }
    setBusy(false);
    void loadFiles();
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    setBusy(true);
    await fetch("/api/portal/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crm_client_id, content: noteText.trim() }),
    });
    setNoteText("");
    setBusy(false);
    void load();
  };

  const sendMessage = async () => {
    if (!chatText.trim()) return;
    setBusy(true);
    await fetch("/api/portal/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crm_client_id, content: chatText.trim() }),
    });
    setChatText("");
    setBusy(false);
    void load();
  };

  const TABS: { id: PortalTab; label: string }[] = [
    { id: "pliki",   label: `Pliki (${files.length})` },
    { id: "notatki", label: `Notatki (${notes.length})` },
    { id: "czat",    label: `Czat (${messages.length})` },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F3EE]">
      <BrandHeader companyName={companyName} />

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-2xl bg-white/[0.04] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
                tab === t.id ? "bg-white/12 text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* PLIKI */}
        {tab === "pliki" && (
          <div className="space-y-5">
            {/* Upload zone */}
            <div
              onClick={() => inputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-white/15 py-8 hover:border-white/25 hover:bg-white/[0.03] transition-colors"
            >
              <span className="text-2xl">☁</span>
              {busy ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
              ) : (
                <p className="text-sm text-white/50">Wgraj pliki do katalogu</p>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,video/mp4,video/quicktime,video/webm,application/pdf"
              className="hidden"
              onChange={(e) => {
                void uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />

            {/* Grid */}
            {files.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/30">Brak plików. Wgraj pierwszy!</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {files.map((f) => (
                  <a
                    key={f.id}
                    href={f.public_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group overflow-hidden rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                  >
                    {isImage(f.mime_type) && f.public_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.public_url} alt={f.file_name} className="aspect-square w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center text-3xl">
                        {isVideo(f.mime_type) ? "▶" : f.mime_type === "application/pdf" ? "📄" : "📁"}
                      </div>
                    )}
                    <div className="p-2">
                      <p className="truncate text-[0.65rem] text-white/70">{f.file_name}</p>
                      <p className="text-[0.58rem] text-white/30">{fmtSize(f.size_bytes)}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NOTATKI */}
        {tab === "notatki" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Napisz notatkę…"
                rows={3}
                className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[#F5F3EE] placeholder-white/25 focus:border-white/25 focus:outline-none resize-none"
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void addNote(); }}
              />
              <button
                type="button"
                onClick={addNote}
                disabled={busy || !noteText.trim()}
                className="self-end rounded-2xl bg-[#F5F3EE] px-5 py-3 text-sm font-semibold text-[#0A0A0A] hover:bg-white disabled:opacity-40 transition-opacity"
              >
                Dodaj
              </button>
            </div>

            {notes.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/30">Brak notatek</p>
            ) : (
              <div className="space-y-2">
                {notes.map((n) => (
                  <div key={n.id} className="rounded-2xl bg-white/[0.04] px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm text-white/80">{n.content}</p>
                    <p className="mt-1.5 text-[0.58rem] text-white/30">
                      {n.author === "admin" ? "Cosgral" : n.author_name ?? "Ty"} · {fmtDate(n.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CZAT */}
        {tab === "czat" && (
          <div className="flex flex-col gap-4">
            <div className="h-[50vh] overflow-y-auto rounded-2xl bg-white/[0.03] p-4 space-y-3">
              {messages.length === 0 ? (
                <p className="mt-12 text-center text-sm text-white/25">
                  Napisz wiadomość do Cosgral — odpowiemy najszybciej jak możemy.
                </p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === "client" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.sender === "client"
                        ? "bg-[#F5F3EE]/90 text-[#0A0A0A]"
                        : "bg-white/10 text-[#F5F3EE]"
                    }`}>
                      {m.sender === "admin" && (
                        <p className="mb-0.5 text-[0.58rem] font-bold uppercase tracking-widest opacity-50">Cosgral</p>
                      )}
                      <p className="leading-relaxed">{m.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatBottomRef} />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Napisz wiadomość…"
                className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[#F5F3EE] placeholder-white/25 focus:border-white/25 focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && void sendMessage()}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={busy || !chatText.trim()}
                className="rounded-2xl bg-[#F5F3EE] px-5 py-3 text-sm font-semibold text-[#0A0A0A] hover:bg-white disabled:opacity-40 transition-opacity"
              >
                Wyślij
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

type ViewState =
  | { phase: "loading" }
  | { phase: "not_found" }
  | { phase: "request_access"; companyName: string }
  | { phase: "waiting"; requestId: string; companyName: string }
  | { phase: "dashboard"; companyName: string; crm_client_id: string; callerName: string };

export default function PortalPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [view, setView] = useState<ViewState>({ phase: "loading" });

  useEffect(() => {
    async function init() {
      // Check if we already have a session cookie
      const sessionRes = await fetch("/api/portal/session");
      const sessionData = await sessionRes.json();

      if (sessionData.authenticated) {
        // Already authenticated — load catalog data
        const res = await fetch(`/api/portal/${slug}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          setView({ phase: "not_found" });
          return;
        }
        setView({
          phase: "dashboard",
          companyName: data.client.company_name,
          crm_client_id: data.client.id,
          callerName: sessionData.requester_name ?? "Klient",
        });
        return;
      }

      // Check if slug is valid
      const slugRes = await fetch(`/api/portal/${slug}`, { cache: "no-store" });
      if (slugRes.status === 401) {
        // Slug exists but we're not authed — show access request form
        // We need the company name — slug check from a public endpoint isn't available
        // Use the slug to parse a reasonable company name fallback
        setView({ phase: "request_access", companyName: slug.replace(/-[a-z0-9]{4}$/, "").replace(/-/g, " ") });
        return;
      }
      if (!slugRes.ok) {
        setView({ phase: "not_found" });
        return;
      }
    }
    void init();
  }, [slug]);

  if (view.phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
      </div>
    );
  }

  if (view.phase === "not_found") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] text-[#F5F3EE]">
        <p className="text-xs uppercase tracking-[0.3em] text-white/30">Cosgral</p>
        <h1 className="mt-4 text-2xl font-light">Katalog nie istnieje</h1>
        <p className="mt-2 text-sm text-white/40">Sprawdź link który otrzymałeś od Cosgral.</p>
      </div>
    );
  }

  if (view.phase === "request_access") {
    return (
      <>
        <BrandHeader companyName={view.companyName} />
        <RequestAccessView
          slug={slug}
          companyName={view.companyName}
          onRequested={(requestId) =>
            setView({ phase: "waiting", requestId, companyName: view.companyName })
          }
        />
      </>
    );
  }

  if (view.phase === "waiting") {
    return (
      <WaitingView
        requestId={view.requestId}
        onApproved={async (token) => {
          // Now load catalog data
          const res = await fetch(`/api/portal/${slug}`, { cache: "no-store" });
          const data = await res.json();
          setView({
            phase: "dashboard",
            companyName: view.companyName,
            crm_client_id: data.client?.id ?? "",
            callerName: "Klient",
          });
        }}
      />
    );
  }

  return (
    <PortalDashboard
      companyName={view.companyName}
      crm_client_id={view.crm_client_id}
      callerName={view.callerName}
    />
  );
}
