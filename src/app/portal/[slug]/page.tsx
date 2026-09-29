"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { PortalFile, PortalNote, PortalMessage } from "@/lib/portal-db";

// ── helpers ───────────────────────────────────────────────────────────────
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

// ── Cosgral wordmark ──────────────────────────────────────────────────────
function CosgralMark({ dim = false }: { dim?: boolean }) {
  return (
    <span
      className={`text-[0.65rem] font-bold uppercase tracking-[0.35em] ${
        dim ? "text-white/25" : "text-white/60"
      }`}
    >
      Cosgral
    </span>
  );
}

// ── Top bar ───────────────────────────────────────────────────────────────
function TopBar({ companyName, callerName }: { companyName: string; callerName?: string }) {
  return (
    <header className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-6 py-4 bg-[#030303]/80 backdrop-blur-2xl border-b border-white/[0.06]">
      <CosgralMark />
      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-xs text-white/35 tracking-wide">{companyName}</span>
        {callerName && (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[0.6rem] font-semibold text-white/70 uppercase">
            {callerName.slice(0, 1)}
          </span>
        )}
      </div>
    </header>
  );
}

// ── Loading screen ────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030303]">
      <div className="flex flex-col items-center gap-5">
        <CosgralMark dim />
        <div className="h-px w-24 overflow-hidden bg-white/10">
          <div className="h-full w-1/2 animate-[slide_1.4s_ease-in-out_infinite] bg-white/40" />
        </div>
      </div>
    </div>
  );
}

// ── Request access ────────────────────────────────────────────────────────
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
    if (!name.trim()) { setError("Podaj imię i nazwisko"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/portal/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, requester_name: name.trim(), requester_email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Błąd — spróbuj ponownie"); return; }
      onRequested(data.request_id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#030303]">
      {/* hero */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <div className="w-full max-w-[400px] space-y-10">

          {/* Brand + title */}
          <div className="space-y-4">
            <CosgralMark />
            <div>
              <h1 className="text-3xl font-light tracking-tight text-[#F5F3EE]">
                Katalog materiałów
              </h1>
              <p className="mt-1.5 text-sm text-white/40">{companyName}</p>
            </div>
            <div className="h-px w-full bg-white/8" />
            <p className="text-sm leading-relaxed text-white/45">
              Podaj swoje imię — Cosgral otrzyma powiadomienie i w ciągu chwili zatwierdzi Twój dostęp.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[0.65rem] uppercase tracking-[0.18em] text-white/35">
                Imię i nazwisko
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jan Kowalski"
                autoFocus
                className="w-full border-0 border-b border-white/15 bg-transparent pb-2.5 pt-1 text-base text-[#F5F3EE] placeholder-white/20 outline-none transition-colors focus:border-white/40"
                onKeyDown={(e) => e.key === "Enter" && void submit()}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[0.65rem] uppercase tracking-[0.18em] text-white/35">
                Email <span className="text-white/20 normal-case">(opcjonalnie)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jan@firma.pl"
                className="w-full border-0 border-b border-white/15 bg-transparent pb-2.5 pt-1 text-base text-[#F5F3EE] placeholder-white/20 outline-none transition-colors focus:border-white/40"
                onKeyDown={(e) => e.key === "Enter" && void submit()}
              />
            </div>

            {error && (
              <p className="text-xs text-red-400/90">{error}</p>
            )}

            <div className="pt-4">
              <button
                type="button"
                onClick={submit}
                disabled={submitting || !name.trim()}
                className="group relative w-full overflow-hidden rounded-full bg-[#F5F3EE] px-8 py-3.5 text-sm font-semibold text-[#0A0A0A] transition-all duration-300 hover:bg-white disabled:opacity-40"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black/70" />
                    Wysyłam…
                  </span>
                ) : (
                  "Poproś o dostęp"
                )}
              </button>
            </div>
          </div>

          <p className="text-center text-[0.65rem] text-white/20">
            Twoje dane są bezpieczne i używane wyłącznie w celu identyfikacji.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Waiting for approval ──────────────────────────────────────────────────
function WaitingView({
  requestId,
  companyName,
  onApproved,
}: {
  requestId: string;
  companyName: string;
  onApproved: (token: string) => void;
}) {
  const [dots, setDots] = useState(0);

  // Animate dots
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d + 1) % 4), 500);
    return () => clearInterval(id);
  }, []);

  // Poll for approval every 5s
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/portal/approve/${requestId}`);
        const data = await res.json();
        if (data.status === "approved" && data.token) {
          document.cookie = `portal_session=${data.token};path=/;max-age=${60 * 60 * 24 * 30};samesite=lax`;
          onApproved(data.token);
        }
      } catch { /* ignore network errors while polling */ }
    }, 5000);
    return () => clearInterval(id);
  }, [requestId, onApproved]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#030303] px-6">
      <div className="w-full max-w-[400px] space-y-10 text-center">
        <CosgralMark dim />

        {/* Pulsing ring */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center">
          <div className="absolute h-20 w-20 animate-ping rounded-full bg-white/5" />
          <div className="relative h-12 w-12 rounded-full bg-white/[0.07] flex items-center justify-center">
            <div className="h-4 w-4 rounded-full bg-white/30" />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-light text-[#F5F3EE]">
            Prośba wysłana{"·".repeat(0)}
            <span className="text-white/30">{".".repeat(dots)}</span>
          </h2>
          <p className="text-sm leading-relaxed text-white/40">
            Cosgral otrzymał powiadomienie.<br />
            Po zatwierdzeniu dostęp otworzy się automatycznie.
          </p>
          <p className="text-xs text-white/20">{companyName}</p>
        </div>

        <p className="text-[0.65rem] text-white/15">
          Możesz zostawić tę kartę otwartą.
        </p>
      </div>
    </div>
  );
}

// ── File grid ─────────────────────────────────────────────────────────────
function FileGrid({ files, uploading, onUpload }: {
  files: PortalFile[];
  uploading: boolean;
  onUpload: (f: FileList | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      {/* Upload strip */}
      <div
        onClick={() => inputRef.current?.click()}
        className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-white/10 px-5 py-4 transition-colors hover:border-white/20 hover:bg-white/[0.02]"
      >
        {uploading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60 shrink-0" />
        ) : (
          <svg className="h-4 w-4 shrink-0 text-white/35" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
        )}
        <div>
          <p className="text-sm text-white/55 group-hover:text-white/80 transition-colors">
            {uploading ? "Wgrywam pliki…" : "Wgraj pliki"}
          </p>
          <p className="text-[0.62rem] text-white/25">Zdjęcia, wideo, PDF · max 100 MB</p>
        </div>
      </div>
      <input ref={inputRef} type="file" multiple
        accept="image/*,video/mp4,video/quicktime,video/webm,application/pdf"
        className="hidden"
        onChange={(e) => { onUpload(e.target.files); e.target.value = ""; }}
      />

      {files.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-white/20">Brak plików w katalogu</p>
          <p className="mt-1 text-xs text-white/12">Wgraj pierwszy materiał powyżej</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {files.map((f) => (
            <a key={f.id} href={f.public_url ?? "#"} target="_blank" rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-xl bg-white/[0.04] transition-colors hover:bg-white/[0.07]"
            >
              {isImage(f.mime_type) && f.public_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.public_url} alt={f.file_name}
                  className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center">
                  <span className="text-3xl opacity-50">
                    {isVideo(f.mime_type) ? "▶" : f.mime_type === "application/pdf" ? "📄" : "📁"}
                  </span>
                </div>
              )}
              <div className="p-2.5">
                <p className="truncate text-[0.65rem] text-white/60">{f.file_name}</p>
                <p className="mt-0.5 text-[0.58rem] text-white/25">{fmtSize(f.size_bytes)}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Notes panel ───────────────────────────────────────────────────────────
function NotesPanel({ notes, crm_client_id, onChanged }: {
  notes: PortalNote[];
  crm_client_id: string;
  onChanged: () => void;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await fetch("/api/portal/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crm_client_id, content: text.trim() }),
    });
    setText("");
    setSaving(false);
    onChanged();
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Napisz notatkę…"
          rows={3}
          className="flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[#F5F3EE] placeholder-white/20 outline-none focus:border-white/20 transition-colors"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void add(); }}
        />
        <button type="button" onClick={add} disabled={saving || !text.trim()}
          className="self-end rounded-xl bg-[#F5F3EE] px-5 py-3 text-sm font-semibold text-[#0A0A0A] hover:bg-white disabled:opacity-40 transition-opacity"
        >
          {saving ? "…" : "Dodaj"}
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="py-12 text-center text-sm text-white/20">Brak notatek</p>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3.5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/75">{n.content}</p>
              <p className="mt-2 text-[0.6rem] text-white/25">
                {n.author === "admin" ? "Cosgral" : n.author_name ?? "Ty"} · {fmtDate(n.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Chat panel ────────────────────────────────────────────────────────────
function ChatPanel({ messages, crm_client_id, callerName, onNewMessage }: {
  messages: PortalMessage[];
  crm_client_id: string;
  callerName: string;
  onNewMessage: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    await fetch("/api/portal/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crm_client_id, content: text.trim() }),
    });
    setText("");
    setSending(false);
    onNewMessage();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Messages */}
      <div className="h-[55vh] overflow-y-auto rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full bg-white/[0.06] p-4">
              <svg className="h-5 w-5 text-white/30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
            </div>
            <p className="text-sm text-white/25">Napisz wiadomość do Cosgral</p>
            <p className="text-xs text-white/15">Odpowiemy jak najszybciej</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === "client" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[82%] space-y-1 ${m.sender === "client" ? "items-end" : "items-start"} flex flex-col`}>
                {m.sender === "admin" && (
                  <span className="text-[0.58rem] uppercase tracking-widest text-white/25 px-1">Cosgral</span>
                )}
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.sender === "client"
                    ? "rounded-br-sm bg-[#F5F3EE] text-[#0A0A0A]"
                    : "rounded-bl-sm bg-white/[0.09] text-white/85"
                }`}>
                  {m.content}
                </div>
                <span className="text-[0.55rem] text-white/20 px-1">{fmtDate(m.created_at)}</span>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-end gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Napisz wiadomość…"
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[#F5F3EE] placeholder-white/20 outline-none focus:border-white/20 transition-colors"
          onKeyDown={(e) => e.key === "Enter" && void send()}
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || !text.trim()}
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-[#F5F3EE] text-[#0A0A0A] transition-opacity disabled:opacity-40 hover:bg-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────
type PortalTab = "pliki" | "notatki" | "czat";

function PortalDashboard({
  slug,
  companyName,
  crm_client_id,
  callerName,
}: {
  slug: string;
  companyName: string;
  crm_client_id: string;
  callerName: string;
}) {
  const [files, setFiles] = useState<PortalFile[]>([]);
  const [notes, setNotes] = useState<PortalNote[]>([]);
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [tab, setTab] = useState<PortalTab>("pliki");
  const [uploading, setUploading] = useState(false);

  const loadAll = useCallback(async () => {
    const res = await fetch(`/api/portal/${slug}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setFiles(data.files ?? []);
    setNotes(data.notes ?? []);
    setMessages(data.messages ?? []);
  }, [slug]);

  const loadChat = useCallback(async () => {
    const res = await fetch(`/api/portal/chat?crm_client_id=${crm_client_id}`);
    const data = await res.json();
    setMessages(data.messages ?? []);
  }, [crm_client_id]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  useEffect(() => {
    if (tab !== "czat") return;
    const id = setInterval(loadChat, 8000);
    return () => clearInterval(id);
  }, [tab, loadChat]);

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    setUploading(true);
    for (const file of Array.from(fileList)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("crm_client_id", crm_client_id);
      await fetch("/api/portal/upload", { method: "POST", body: fd });
    }
    setUploading(false);
    void loadAll();
  };

  const TABS: { id: PortalTab; label: string; count: number }[] = [
    { id: "pliki",   label: "Pliki",   count: files.length },
    { id: "notatki", label: "Notatki", count: notes.length },
    { id: "czat",    label: "Czat",    count: messages.length },
  ];

  return (
    <div className="min-h-screen bg-[#030303] text-[#F5F3EE]">
      <TopBar companyName={companyName} callerName={callerName} />

      <div className="mx-auto max-w-2xl px-5 pt-24 pb-16">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-light tracking-tight text-[#F5F3EE]">{companyName}</h1>
          <p className="mt-1 text-sm text-white/35">Twój katalog materiałów</p>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-0 border-b border-white/[0.08]">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-2 pb-3 pr-6 text-sm transition-colors ${
                tab === t.id ? "text-[#F5F3EE]" : "text-white/30 hover:text-white/55"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className="text-[0.6rem] text-white/25">{t.count}</span>
              )}
              {tab === t.id && (
                <span className="absolute bottom-0 left-0 right-6 h-px bg-[#F5F3EE]/60" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "pliki" && (
          <FileGrid files={files} uploading={uploading} onUpload={uploadFiles} />
        )}
        {tab === "notatki" && (
          <NotesPanel notes={notes} crm_client_id={crm_client_id} onChanged={loadAll} />
        )}
        {tab === "czat" && (
          <ChatPanel
            messages={messages}
            crm_client_id={crm_client_id}
            callerName={callerName}
            onNewMessage={loadChat}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-6 text-center">
        <CosgralMark dim />
      </footer>
    </div>
  );
}

// ── Main orchestrator ─────────────────────────────────────────────────────
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
      // 1. Check for existing session cookie first
      const sessionRes = await fetch("/api/portal/session");
      const sessionData = await sessionRes.json();

      if (sessionData.authenticated) {
        // Already have a valid session — go straight to dashboard
        const res = await fetch(`/api/portal/${slug}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) { setView({ phase: "not_found" }); return; }
        setView({
          phase: "dashboard",
          companyName: data.client.company_name,
          crm_client_id: data.client.id,
          callerName: sessionData.requester_name ?? "Klient",
        });
        return;
      }

      // 2. No session — check if slug is valid to show the right screen
      const slugRes = await fetch(`/api/portal/${slug}`, { cache: "no-store" });

      if (slugRes.status === 401) {
        // Slug exists but unauthenticated — show access request form
        // We don't have company name from this response so we derive it from slug
        const friendly = slug
          .replace(/-[a-z0-9]{4}$/, "")   // strip 4-char random suffix
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        setView({ phase: "request_access", companyName: friendly });
        return;
      }

      if (!slugRes.ok) {
        setView({ phase: "not_found" });
        return;
      }
    }
    void init();
  }, [slug]);

  // ── render ────────────────────────────────────────────────────────────

  if (view.phase === "loading") return <LoadingScreen />;

  if (view.phase === "not_found") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#030303] gap-6 px-6 text-center">
        <CosgralMark dim />
        <div>
          <h1 className="text-2xl font-light text-[#F5F3EE]">Nie znaleziono katalogu</h1>
          <p className="mt-2 text-sm text-white/35">
            Sprawdź link który otrzymałeś od Cosgral.
          </p>
        </div>
      </div>
    );
  }

  if (view.phase === "request_access") {
    return (
      <RequestAccessView
        slug={slug}
        companyName={view.companyName}
        onRequested={(requestId) =>
          setView({ phase: "waiting", requestId, companyName: view.companyName })
        }
      />
    );
  }

  if (view.phase === "waiting") {
    return (
      <WaitingView
        requestId={view.requestId}
        companyName={view.companyName}
        onApproved={async () => {
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
      slug={slug}
      companyName={view.companyName}
      crm_client_id={view.crm_client_id}
      callerName={view.callerName}
    />
  );
}
