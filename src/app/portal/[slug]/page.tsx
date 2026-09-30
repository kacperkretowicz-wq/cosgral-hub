"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CosgralBrand } from "@/components/CosgralLogo";
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

// ── Ambient background (matches CosgralAmbient from admin) ────────────────
function PortalAmbient() {
  return (
    <>
      {/* Deep noise grain layer — same as body::after in globals.css */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.07] mix-blend-overlay"
        style={{ backgroundImage: "url('/cosgral/charcoal-grain.jpg')", backgroundSize: "280px" }}
      />
      {/* Radial glow top-left */}
      <div
        aria-hidden
        className="pointer-events-none fixed z-0"
        style={{
          top: "-20vh", left: "-15vw",
          width: "70vmax", height: "70vmax",
          borderRadius: "50%",
          background: "radial-gradient(circle closest-side, rgba(91,141,239,0.13) 0%, transparent 70%)",
        }}
      />
      {/* Radial glow bottom-right */}
      <div
        aria-hidden
        className="pointer-events-none fixed z-0"
        style={{
          bottom: "-20vh", right: "-15vw",
          width: "60vmax", height: "60vmax",
          borderRadius: "50%",
          background: "radial-gradient(circle closest-side, rgba(255,255,255,0.06) 0%, transparent 70%)",
        }}
      />
    </>
  );
}

// ── Top bar ───────────────────────────────────────────────────────────────
function TopBar({ companyName, callerName }: { companyName: string; callerName?: string }) {
  return (
    <header className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-5 py-3 glass-strong border-b border-white/[0.08]">
      <CosgralBrand size={22} subtitle="Hub" />
      <div className="flex items-center gap-3">
        <span className="hidden sm:block label-mono">{companyName}</span>
        {callerName && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full surface text-[0.65rem] font-semibold text-white/80 uppercase">
            {callerName.slice(0, 1)}
          </div>
        )}
      </div>
    </header>
  );
}

// ── Loading screen ────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[--bg]">
      <PortalAmbient />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <CosgralBrand size={32} subtitle="Hub" />
        <div className="h-px w-32 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full w-1/2 rounded-full bg-white/40"
            style={{ animation: "slide 1.4s ease-in-out infinite" }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Request Access view ───────────────────────────────────────────────────
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
    <div className="relative min-h-screen bg-[--bg] flex flex-col items-center justify-center px-5 py-20">
      <PortalAmbient />
      <div className="relative z-10 w-full max-w-md space-y-8">

        {/* Hero card */}
        <div className="hub-tile p-8 space-y-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <CosgralBrand size={28} subtitle="Hub" />
          </div>

          {/* Title */}
          <div className="space-y-1">
            <p className="label-mono">Materiały klienta</p>
            <h1 className="text-2xl font-light tracking-tight text-[--ink]">{companyName}</h1>
          </div>

          <div className="h-px bg-white/[0.08]" />

          <p className="text-sm leading-relaxed text-white/50">
            Podaj swoje imię — Cosgral otrzyma powiadomienie i w ciągu chwili zatwierdzi dostęp.
          </p>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="label-mono">Imię i nazwisko</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jan Kowalski"
                autoFocus
                className="glass-field w-full px-5 py-3 text-sm text-[--ink] placeholder-white/20 rounded-2xl"
                onKeyDown={(e) => e.key === "Enter" && void submit()}
              />
            </div>
            <div className="space-y-1.5">
              <label className="label-mono">
                Email <span className="normal-case text-white/20">(opcjonalnie)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jan@firma.pl"
                className="glass-field w-full px-5 py-3 text-sm text-[--ink] placeholder-white/20 rounded-2xl"
                onKeyDown={(e) => e.key === "Enter" && void submit()}
              />
            </div>
            {error && <p className="text-xs text-red-400/90">{error}</p>}
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={submitting || !name.trim()}
            className="w-full rounded-full bg-[--ink] py-3.5 text-sm font-semibold text-[--bg] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black/70" />
                Wysyłam…
              </span>
            ) : "Poproś o dostęp"}
          </button>
        </div>

        <p className="text-center text-[0.65rem] text-white/20">
          Twoje dane są bezpieczne i używane wyłącznie w celu identyfikacji.
        </p>
      </div>
    </div>
  );
}

// ── Waiting view ──────────────────────────────────────────────────────────
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
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d + 1) % 4), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/portal/approve/${requestId}`);
        const data = await res.json();
        if (data.status === "approved" && data.token) {
          document.cookie = `portal_session=${data.token};path=/;max-age=${60 * 60 * 24 * 30};samesite=lax`;
          onApproved(data.token);
        }
      } catch { /* ignore network errors */ }
    }, 5000);
    return () => clearInterval(id);
  }, [requestId, onApproved]);

  return (
    <div className="relative min-h-screen bg-[--bg] flex flex-col items-center justify-center px-5">
      <PortalAmbient />
      <div className="relative z-10 w-full max-w-sm">
        <div className="hub-tile p-10 text-center space-y-8">
          <CosgralBrand size={28} subtitle="Hub" className="justify-center" />

          {/* Pulsing ring */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center relative">
            <div className="absolute h-20 w-20 animate-ping rounded-full bg-white/[0.06]" />
            <div className="relative h-12 w-12 rounded-full surface flex items-center justify-center">
              <div className="h-4 w-4 rounded-full bg-white/40" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-light text-[--ink]">
              Prośba wysłana
              <span className="text-white/30">{".".repeat(dots)}</span>
            </h2>
            <p className="text-sm text-white/40">
              Cosgral otrzymał powiadomienie.<br />
              Po zatwierdzeniu dostęp otworzy się automatycznie.
            </p>
            <p className="label-mono mt-2">{companyName}</p>
          </div>

          <p className="text-[0.6rem] text-white/15">Możesz zostawić tę kartę otwartą.</p>
        </div>
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
      {/* Upload tile */}
      <div
        onClick={() => inputRef.current?.click()}
        className="hub-tile group flex cursor-pointer items-center gap-4 px-5 py-4 transition-all"
        style={{ "--tile-glow": "rgba(91,141,239,0.6)", "--tile-tint": "rgba(91,141,239,0.1)" } as React.CSSProperties}
      >
        {uploading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/70 shrink-0" />
        ) : (
          <svg className="h-5 w-5 shrink-0 text-white/50" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
        )}
        <div>
          <p className="text-sm text-[--ink]">{uploading ? "Przesyłam…" : "Dodaj pliki"}</p>
          <p className="label-mono mt-0.5">zdjęcia · wideo · pdf</p>
        </div>
        {/* Hidden file input — accept ALL images and videos (iOS camera roll) */}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*,.mov,.mp4,.m4v,.heic,.heif,application/pdf"
          className="hidden"
          onChange={(e) => onUpload(e.target.files)}
        />
      </div>

      {files.length === 0 && !uploading && (
        <div className="surface-list px-6 py-12 text-center">
          <p className="text-sm text-white/30">Brak plików — prześlij pierwsze materiały powyżej.</p>
        </div>
      )}

      {/* Grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((f) => (
            <div key={f.id} className="hub-tile overflow-hidden group">
              {isImage(f.mime_type) && f.public_url ? (
                <a href={f.public_url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.public_url}
                    alt={f.file_name}
                    className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </a>
              ) : isVideo(f.mime_type) && f.public_url ? (
                <a href={f.public_url} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="aspect-square w-full bg-black flex items-center justify-center">
                    <svg className="h-10 w-10 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </a>
              ) : (
                <div className="aspect-square w-full flex flex-col items-center justify-center gap-2 p-4">
                  <svg className="h-8 w-8 text-white/30" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  <p className="text-[0.6rem] text-white/30 text-center leading-tight break-all">{f.file_name}</p>
                </div>
              )}
              {/* Meta bar */}
              <div className="px-3 py-2 flex items-center justify-between border-t border-white/[0.06]">
                <p className="text-[0.6rem] text-white/35 truncate max-w-[70%]">{f.file_name}</p>
                <span className="label-mono text-[0.55rem]">{fmtSize(f.size_bytes)}</span>
              </div>
            </div>
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

  const save = async () => {
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
    <div className="space-y-4">
      {/* New note card */}
      <div className="hub-tile p-5 space-y-3" style={{ "--tile-glow": "rgba(255,255,255,0.35)" } as React.CSSProperties}>
        <p className="label-mono">Nowa notatka</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Wpisz treść notatki…"
          rows={4}
          className="glass-field w-full rounded-2xl px-4 py-3 text-sm text-[--ink] placeholder-white/20 resize-none"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving || !text.trim()}
          className="rounded-full bg-[--ink] px-6 py-2.5 text-sm font-semibold text-[--bg] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "Zapisuję…" : "Zapisz notatkę"}
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="surface-list px-6 py-12 text-center">
          <p className="text-sm text-white/30">Brak notatek.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <div key={n.id} className="surface p-5 space-y-2">
              <p className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">{n.content}</p>
              <p className="label-mono">{fmtDate(n.created_at)}</p>
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
      body: JSON.stringify({ crm_client_id, content: text.trim(), sender: "client", sender_name: callerName }),
    });
    setText("");
    setSending(false);
    onNewMessage();
  };

  return (
    <div className="space-y-4">
      {/* Messages area */}
      <div className="surface-list p-4 min-h-[260px] max-h-[420px] overflow-y-auto flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
            <svg className="h-8 w-8 text-white/15" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
            <p className="text-sm text-white/25">Napisz wiadomość do Cosgral</p>
            <p className="label-mono">Odpowiemy jak najszybciej</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === "client" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[82%] space-y-1 flex flex-col ${m.sender === "client" ? "items-end" : "items-start"}`}>
                {m.sender === "admin" && (
                  <span className="label-mono px-1">Cosgral</span>
                )}
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.sender === "client"
                    ? "rounded-br-sm bg-[--ink] text-[--bg]"
                    : "rounded-bl-sm glass text-white/85"
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

      {/* Input row */}
      <div className="flex items-end gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Napisz wiadomość…"
          className="glass-field flex-1 px-5 py-3 text-sm text-[--ink] placeholder-white/20 rounded-2xl"
          onKeyDown={(e) => e.key === "Enter" && void send()}
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || !text.trim()}
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-[--ink] text-[--bg] transition-opacity disabled:opacity-40 hover:opacity-90"
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
  slug, companyName, crm_client_id, callerName,
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
    <div className="relative min-h-screen bg-[--bg] text-[--ink]">
      <PortalAmbient />
      <TopBar companyName={companyName} callerName={callerName} />

      <div className="relative z-10 mx-auto max-w-2xl px-4 pt-20 pb-20">

        {/* Page header tile */}
        <div className="hub-tile p-6 mb-6 flex items-center justify-between"
          style={{ "--tile-glow": "rgba(91,141,239,0.55)", "--tile-tint": "rgba(91,141,239,0.1)" } as React.CSSProperties}>
          <div>
            <p className="label-mono mb-1">Twój katalog</p>
            <h1 className="text-xl font-light tracking-tight">{companyName}</h1>
          </div>
          <div className="text-right hidden sm:block">
            <p className="label-mono">pliki</p>
            <p className="text-2xl font-light">{files.length}</p>
          </div>
        </div>

        {/* Tabs — pill style */}
        <div className="glass-pill mb-6 flex gap-1 rounded-full p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-medium transition-all duration-200 ${
                tab === t.id
                  ? "bg-[--ink] text-[--bg] shadow-sm"
                  : "text-white/45 hover:text-white/70"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`text-[0.58rem] ${tab === t.id ? "text-[--bg]/50" : "text-white/25"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "pliki"   && <FileGrid files={files} uploading={uploading} onUpload={uploadFiles} />}
        {tab === "notatki" && <NotesPanel notes={notes} crm_client_id={crm_client_id} onChanged={loadAll} />}
        {tab === "czat"    && <ChatPanel messages={messages} crm_client_id={crm_client_id} callerName={callerName} onNewMessage={loadChat} />}
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-6 flex justify-center">
        <CosgralBrand size={18} subtitle="Hub" />
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
      const sessionRes = await fetch("/api/portal/session");
      const sessionData = await sessionRes.json();

      if (sessionData.authenticated) {
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

      const slugRes = await fetch(`/api/portal/${slug}`, { cache: "no-store" });
      if (slugRes.status === 401) {
        const friendly = slug
          .replace(/-[a-z0-9]{4}$/, "")
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        setView({ phase: "request_access", companyName: friendly });
        return;
      }
      if (!slugRes.ok) { setView({ phase: "not_found" }); return; }
    }
    void init();
  }, [slug]);

  if (view.phase === "loading") return <LoadingScreen />;

  if (view.phase === "not_found") {
    return (
      <div className="relative min-h-screen bg-[--bg] flex flex-col items-center justify-center gap-8 px-6 text-center">
        <PortalAmbient />
        <div className="relative z-10 hub-tile p-10 max-w-sm w-full space-y-4">
          <CosgralBrand size={28} subtitle="Hub" className="justify-center" />
          <div className="h-px bg-white/[0.08]" />
          <h1 className="text-xl font-light text-[--ink]">Nie znaleziono katalogu</h1>
          <p className="text-sm text-white/40">
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
