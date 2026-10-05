"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CosgralBrand } from "@/components/CosgralLogo";
import { CosgralAmbient } from "@/components/CosgralAmbient";
import { CosgralChatCube } from "@/components/CosgralChatCube";
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
function fmtDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Dzisiaj";
  if (d.toDateString() === yesterday.toDateString()) return "Wczoraj";
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
}
function isImage(m: string) { return m.startsWith("image/"); }
function isVideo(m: string) { return m.startsWith("video/"); }
function isGdrive(f: PortalFile) { return f.storage_provider === "gdrive" || !!f.gdrive_file_id; }

interface Project {
  id: string;
  title: string;
  status: string;
  service_type: string;
  deadline: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_STEPS = [
  { key: "nowe", label: "Zlecenie przyjęte" },
  { key: "w_trakcie", label: "W realizacji" },
  { key: "oczekuje", label: "Oczekuje na Ciebie" },
  { key: "zakonczone", label: "Gotowe!" },
];
const STATUS_INDEX: Record<string, number> = {
  nowe: 0, w_trakcie: 1, oczekuje: 2, zakonczone: 3, anulowane: 3,
};
const SERVICE_LABELS: Record<string, string> = {
  strona_www: "Strona WWW", system_crm: "System CRM",
  automatyzacja_ecommerce: "E-commerce", grafika: "Grafika",
  montaz_wideo: "Wideo", kampania_meta: "Meta Ads",
  kampania_google: "Google Ads", inne: "Inne",
};

function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
}

// ── Upload logic (Google Drive Resumable — chunked 5 MB) ──────────────────
interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

async function uploadChunked(
  uploadUri: string, file: File, mimeType: string,
  onProgress: (pct: number) => void, signal: AbortSignal,
): Promise<string> {
  const CHUNK = 5 * 1024 * 1024;
  const total = file.size;
  let offset = 0;
  const sendChunk = (start: number, end: number, isLast: boolean): Promise<string | null> =>
    new Promise((resolve, reject) => {
      const chunk = file.slice(start, end);
      const rangeHeader = isLast ? `bytes ${start}-${end - 1}/${total}` : `bytes ${start}-${end - 1}/*`;
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUri);
      xhr.timeout = 5 * 60 * 1000;
      xhr.setRequestHeader("Content-Type", mimeType);
      xhr.setRequestHeader("Content-Range", rangeHeader);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.min(95, Math.round(((start + e.loaded) / total) * 95)));
      };
      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try { const resp = JSON.parse(xhr.responseText) as { id?: string }; onProgress(100); resolve(resp.id ?? ""); }
          catch { reject(new Error("Nieprawidłowa odpowiedź serwera")); }
        } else if (xhr.status === 308) { resolve(null); }
        else { reject(new Error(`Błąd ${xhr.status}: ${xhr.statusText || "nieznany"}`)); }
      };
      xhr.ontimeout = () => reject(new Error("Timeout — za wolne połączenie"));
      xhr.onerror = () => reject(new Error("Błąd sieci (sprawdź połączenie)"));
      signal.addEventListener("abort", () => { xhr.abort(); reject(new Error("Anulowano")); }, { once: true });
      xhr.send(chunk);
    });
  while (offset < total) {
    if (signal.aborted) throw new Error("Anulowano");
    const end = Math.min(offset + CHUNK, total);
    const isLast = end === total;
    let fileId: string | null;
    try { fileId = await sendChunk(offset, end, isLast); }
    catch (err) {
      if (err instanceof Error && err.message === "Anulowano") throw err;
      await new Promise((r) => setTimeout(r, 2000));
      fileId = await sendChunk(offset, end, isLast);
    }
    if (fileId !== null) return fileId;
    offset = end;
  }
  throw new Error("Upload zakończony bez ID pliku");
}

async function uploadFileToDrive(
  file: File, crm_client_id: string,
  onProgress: (pct: number) => void, signal: AbortSignal,
): Promise<{ gdrive_file_id: string; gdrive_folder_id: string }> {
  let mimeType = file.type || "";
  if (!mimeType) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const map: Record<string, string> = {
      mov: "video/quicktime", mp4: "video/mp4", m4v: "video/x-m4v",
      webm: "video/webm", jpg: "image/jpeg", jpeg: "image/jpeg",
      png: "image/png", webp: "image/webp", gif: "image/gif",
      heic: "image/heic", heif: "image/heif", pdf: "application/pdf",
    };
    mimeType = map[ext] ?? "application/octet-stream";
  }
  const initRes = await fetch("/api/portal/gdrive-init", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_name: file.name, mime_type: mimeType, size_bytes: file.size, crm_client_id }), signal,
  });
  if (!initRes.ok) { const err = await initRes.json().catch(() => ({})); throw new Error(err.error ?? `Błąd inicjalizacji (${initRes.status})`); }
  const { uploadUri, folderId } = await initRes.json() as { uploadUri: string; folderId: string };
  const fileId = await uploadChunked(uploadUri, file, mimeType, onProgress, signal);
  return { gdrive_file_id: fileId, gdrive_folder_id: folderId };
}


// ── urlBase64ToUint8Array helper for push ────────────────────────────────
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}
function isIos() { return typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent); }
function isStandalone() { return typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)); }

// ── Portal Header (identical to AdminLayout header) ───────────────────────
function PortalHeader({ companyName, callerName, onLogout, onAiOpen }: {
  companyName: string; callerName: string;
  onLogout: () => void; onAiOpen: () => void;
}) {
  return (
    <header className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 py-3 glass-strong border-b border-white/[0.08]">
      <div className="flex items-center gap-3">
        <CosgralBrand size={22} subtitle="Hub" />
        <span className="hidden sm:block h-4 w-px bg-white/[0.12]" />
        <span className="hidden sm:block text-xs text-white/40 font-medium tracking-wider uppercase">{companyName}</span>
      </div>
      <div className="flex items-center gap-2">
        {/* AI Cube button */}
        <button type="button" onClick={onAiOpen}
          className="group relative flex h-10 w-10 items-center justify-center overflow-visible rounded-2xl border border-white/15 bg-black/40 shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur-md transition duration-300 hover:border-white/30 hover:-translate-y-0.5">
          <span className="absolute inset-[-18%]"><CosgralChatCube dimmed={false} /></span>
          <span className="pointer-events-none absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#5b8def] shadow-[0_0_10px_rgba(91,141,239,0.85)]" />
        </button>
        {/* Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.08] border border-white/[0.12] text-[0.6rem] font-bold text-white/70 uppercase">
          {callerName.slice(0, 1)}
        </div>
        {/* Logout */}
        <button type="button" onClick={onLogout}
          className="flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.05] px-3 py-1.5 text-xs text-white/50 transition hover:bg-white/[0.1] hover:text-white/80">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
          </svg>
          Wyloguj
        </button>
      </div>
    </header>
  );
}

// ── Loading ───────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <CosgralAmbient />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <CosgralBrand size={32} subtitle="Hub" />
        <div className="h-px w-32 overflow-hidden rounded-full bg-white/[0.08]">
          <div className="h-full w-1/2 rounded-full bg-white/40" style={{ animation: "slide 1.4s ease-in-out infinite" }} />
        </div>
      </div>
    </div>
  );
}

// ── Auth card shell ───────────────────────────────────────────────────────
function AuthCard({ companyName, children }: { companyName: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-5 py-16 overflow-hidden">
      <CosgralAmbient />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(91,141,239,0.07) 0%, transparent 65%)" }} />
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <CosgralBrand size={22} subtitle="Hub" />
          <span className="label-mono text-white/30">{companyName}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── SetupAuth ─────────────────────────────────────────────────────────────
function SetupAuthView({ slug, companyName, onDone }: {
  slug: string; companyName: string;
  onDone: (token: string, crm_client_id: string, username: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (!username.trim()) { setError("Podaj nazwę użytkownika"); return; }
    if (password.length < 4) { setError("Hasło musi mieć co najmniej 4 znaki"); return; }
    if (pin && !/^\d{4}$/.test(pin)) { setError("PIN musi mieć dokładnie 4 cyfry"); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/portal/setup-auth", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, username: username.trim(), password, pin: pin || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Błąd — spróbuj ponownie"); return; }
      document.cookie = `portal_session=${data.token};path=/;max-age=${60 * 60 * 24 * 30};samesite=lax`;
      onDone(data.token, data.crm_client_id, data.requester_name);
    } finally { setSubmitting(false); }
  };
  return (
    <AuthCard companyName={companyName}>
      <div className="hub-tile p-7 space-y-5" style={{ "--tile-glow": "rgba(91,141,239,0.6)", "--tile-tint": "rgba(91,141,239,0.08)" } as React.CSSProperties}>
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08]">
            <svg className="h-5 w-5 text-white/40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
          </div>
          <div><p className="label-mono">Nowe konto</p><h1 className="text-lg font-medium text-white mt-0.5">Utwórz dane dostępu</h1></div>
        </div>
        <div className="h-px bg-white/[0.06]" />
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="label-mono">Login</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="twój_login" autoComplete="username" autoFocus
              className="glass-field w-full px-4 py-3 text-sm text-white placeholder-white/20 rounded-2xl" onKeyDown={(e) => e.key === "Enter" && void submit()} />
          </div>
          <div className="space-y-1.5">
            <label className="label-mono">Hasło <span className="text-white/25 normal-case">(min. 4 znaki)</span></label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password"
              className="glass-field w-full px-4 py-3 text-sm text-white placeholder-white/20 rounded-2xl" onKeyDown={(e) => e.key === "Enter" && void submit()} />
          </div>
          <button type="button" onClick={() => setShowPin(!showPin)} className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors">
            <span className={`h-4 w-4 rounded border transition-colors ${showPin ? "border-white/40 bg-white/10" : "border-white/20"}`}>
              {showPin && <span className="flex h-full w-full items-center justify-center text-[0.55rem] text-white/80">ok</span>}
            </span>
            Dodaj szybki PIN (4 cyfry) — opcjonalnie
          </button>
          {showPin && (
            <div className="space-y-1.5">
              <label className="label-mono">PIN</label>
              <input type="text" inputMode="numeric" maxLength={4} value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1234"
                className="glass-field w-32 px-4 py-3 text-sm text-white placeholder-white/20 rounded-2xl tracking-widest text-center"
                onKeyDown={(e) => e.key === "Enter" && void submit()} />
            </div>
          )}
          {error && <p className="text-xs text-red-400/90">{error}</p>}
        </div>
        <button type="button" onClick={submit} disabled={submitting || !username.trim() || !password}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all disabled:opacity-40"
          style={{ background: "rgba(255,255,255,0.12)", color: "white" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}>
          {submitting ? <span className="flex items-center justify-center gap-2"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />Tworzę konto…</span> : "Utwórz konto i wejdź →"}
        </button>
      </div>
      <p className="text-center text-[0.6rem] text-white/20">Tylko Ty masz dostęp do tego katalogu. Twoje dane są zaszyfrowane.</p>
    </AuthCard>
  );
}

// ── LoginView ─────────────────────────────────────────────────────────────
function LoginView({ slug, companyName, onDone }: {
  slug: string; companyName: string;
  onDone: (token: string, crm_client_id: string, username: string) => void;
}) {
  const [mode, setMode] = useState<"password" | "pin">("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (!username.trim()) { setError("Podaj login"); return; }
    if (mode === "password" && !password) { setError("Podaj hasło"); return; }
    if (mode === "pin" && !/^\d{4}$/.test(pin)) { setError("PIN musi mieć 4 cyfry"); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/portal/auth-login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, username: username.trim(), ...(mode === "password" ? { password } : { pin }) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Błąd logowania"); return; }
      document.cookie = `portal_session=${data.token};path=/;max-age=${60 * 60 * 24 * 30};samesite=lax`;
      onDone(data.token, data.crm_client_id, data.requester_name);
    } finally { setSubmitting(false); }
  };
  return (
    <AuthCard companyName={companyName}>
      <div className="hub-tile p-7 space-y-5" style={{ "--tile-glow": "rgba(91,141,239,0.55)", "--tile-tint": "rgba(91,141,239,0.07)" } as React.CSSProperties}>
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08]">
            <svg className="h-5 w-5 text-white/40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" /></svg>
          </div>
          <div><p className="label-mono">Katalog klienta</p><h1 className="text-lg font-medium text-white mt-0.5">Zaloguj się</h1></div>
        </div>
        <div className="flex rounded-2xl overflow-hidden border border-white/[0.08]">
          {(["password", "pin"] as const).map((m) => (
            <button key={m} type="button" onClick={() => { setMode(m); setError(""); }}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${mode === m ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60"}`}>
              {m === "password" ? "Login + Hasło" : "Login + PIN"}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="label-mono">Login</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="twój_login" autoComplete="username" autoFocus
              className="glass-field w-full px-4 py-3 text-sm text-white placeholder-white/20 rounded-2xl" onKeyDown={(e) => e.key === "Enter" && void submit()} />
          </div>
          {mode === "password" ? (
            <div className="space-y-1.5">
              <label className="label-mono">Hasło</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password"
                className="glass-field w-full px-4 py-3 text-sm text-white placeholder-white/20 rounded-2xl" onKeyDown={(e) => e.key === "Enter" && void submit()} />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="label-mono">PIN</label>
              <div className="flex gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <input key={i} type="text" inputMode="numeric" maxLength={1} value={pin[i] ?? ""} id={`pin-${i}`}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, "");
                      const newPin = (pin.split("").concat(Array(4).fill(""))).slice(0, 4);
                      newPin[i] = d; const joined = newPin.join("").slice(0, 4); setPin(joined);
                      if (d && i < 3) document.getElementById(`pin-${i + 1}`)?.focus();
                    }}
                    onKeyDown={(e) => { if (e.key === "Backspace" && !pin[i] && i > 0) document.getElementById(`pin-${i - 1}`)?.focus(); if (e.key === "Enter") void submit(); }}
                    className="glass-field w-14 h-14 text-center text-xl font-light text-white rounded-2xl" />
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-xs text-red-400/90">{error}</p>}
        </div>
        <button type="button" onClick={submit} disabled={submitting || !username.trim() || (mode === "password" ? !password : pin.length < 4)}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all disabled:opacity-40"
          style={{ background: "rgba(255,255,255,0.12)", color: "white" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}>
          {submitting ? <span className="flex items-center justify-center gap-2"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />Loguję…</span> : "Wejdź do katalogu →"}
        </button>
      </div>
      <p className="text-center text-[0.6rem] text-white/20">Link do katalogu jest prywatny — tylko Ty masz do niego dostęp.</p>
    </AuthCard>
  );
}


// ── Upload Queue UI ───────────────────────────────────────────────────────
function UploadQueue({ items, onRetry }: { items: UploadItem[]; onRetry: (item: UploadItem) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="hub-tile px-4 py-3 space-y-2"
          style={{ "--tile-glow": item.status === "error" ? "rgba(239,68,68,0.5)" : "rgba(91,141,239,0.5)", "--tile-tint": "rgba(91,141,239,0.08)" } as React.CSSProperties}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/80 truncate max-w-[70%]">{item.file.name}</span>
            <span className="label-mono">{item.status === "done" ? "gotowe" : item.status === "error" ? "błąd" : item.status === "pending" ? "czekam…" : `${item.progress}%`}</span>
          </div>
          {item.status === "uploading" && (
            <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${item.progress}%`, background: "linear-gradient(90deg, rgba(91,141,239,0.8) 0%, rgba(255,255,255,0.6) 100%)" }} />
            </div>
          )}
          {item.status === "done" && <div className="h-1 rounded-full bg-white/20"><div className="h-full w-full rounded-full bg-[--ink]/40" /></div>}
          {item.status === "error" && (
            <div className="space-y-1.5">
              <p className="text-xs text-red-400/80">{item.error}</p>
              <button type="button" onClick={() => onRetry(item)} className="text-xs text-white/50 underline hover:text-white/80 transition-colors">↺ Spróbuj ponownie</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── File card ─────────────────────────────────────────────────────────────
function FileCard({ f, isNew }: { f: PortalFile; isNew: boolean }) {
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const gdrive = isGdrive(f);
  const embedUrl = gdrive && f.gdrive_file_id ? `https://drive.google.com/file/d/${f.gdrive_file_id}/preview` : f.public_url;
  const thumbUrl = gdrive && f.gdrive_file_id ? `https://drive.google.com/thumbnail?id=${f.gdrive_file_id}&sz=w400` : null;
  const viewUrl = gdrive && f.gdrive_file_id ? `https://drive.google.com/file/d/${f.gdrive_file_id}/view` : f.public_url;

  const copyLink = async () => {
    if (!viewUrl) return;
    await navigator.clipboard.writeText(viewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`hub-tile overflow-hidden group relative ${isNew ? "ring-1 ring-[#5b8def]/40" : ""}`}>
      {isNew && <span className="absolute top-2 right-2 z-10 rounded-full bg-[#5b8def] px-1.5 py-0.5 text-[0.55rem] font-bold text-white uppercase tracking-wide">Nowy</span>}
      {/* Thumbnail / preview area */}
      <div className="relative aspect-video w-full cursor-pointer bg-black/30" onClick={() => setShowPreview((s) => !s)}>
        {isImage(f.mime_type) && (thumbUrl || f.public_url) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl ?? f.public_url!} alt={f.file_name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : isVideo(f.mime_type) ? (
          showPreview && embedUrl ? (
            gdrive && f.gdrive_file_id ? (
              <iframe src={embedUrl} className="h-full w-full border-0" allow="autoplay" allowFullScreen />
            ) : (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                src={embedUrl}
                className="h-full w-full object-contain bg-black"
                controls
                autoPlay
                playsInline
              />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center gap-3 flex-col">
              {thumbUrl && <img src={thumbUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                <svg className="h-5 w-5 translate-x-0.5 text-white/80" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </div>
              <span className="relative z-10 label-mono text-white/40">Kliknij aby odtworzyć</span>
            </div>
          )
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4">
            <svg className="h-8 w-8 text-white/25" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
        )}
      </div>
      {/* Meta bar */}
      <div className="px-3 py-2.5 flex items-center justify-between gap-2 border-t border-white/[0.06]">
        <p className="text-[0.65rem] text-white/50 truncate">{f.file_name}</p>
        <div className="flex items-center gap-2 shrink-0">
          <span className="label-mono">{fmtSize(f.size_bytes)}</span>
          {viewUrl && (
            <button type="button" onClick={copyLink} title="Kopiuj link" className="text-white/30 hover:text-white/70 transition-colors">
              {copied ? (
                <svg className="h-3.5 w-3.5 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>
              )}
            </button>
          )}
          {viewUrl && (
            <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/70 transition-colors" onClick={(e) => e.stopPropagation()}>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── File grid ─────────────────────────────────────────────────────────────
function FileGrid({ files, queue, onUpload, onRetry, lastVisit }: {
  files: PortalFile[]; queue: UploadItem[];
  onUpload: (f: FileList | null) => void; onRetry: (item: UploadItem) => void;
  lastVisit: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const anyUploading = queue.some((q) => q.status === "uploading" || q.status === "pending");
  const newFiles = files.filter((f) => f.uploaded_by === "admin" && new Date(f.created_at) > new Date(lastVisit));

  return (
    <div className="space-y-4">
      {newFiles.length > 0 && (
        <div className="hub-tile px-5 py-3 flex items-center gap-3"
          style={{ "--tile-glow": "rgba(91,141,239,0.7)", "--tile-tint": "rgba(91,141,239,0.12)" } as React.CSSProperties}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#5b8def]/20">
              <svg className="h-3.5 w-3.5 text-[#5b8def]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>
            </span>
          <div>
            <p className="text-sm text-white/90 font-medium">Cosgral dodał {newFiles.length} {newFiles.length === 1 ? "nowy plik" : "nowe pliki"}</p>
            <p className="label-mono">od Twojej ostatniej wizyty</p>
          </div>
        </div>
      )}
      <div onClick={() => inputRef.current?.click()}
        className="hub-tile group flex cursor-pointer items-center gap-4 px-5 py-4"
        style={{ "--tile-glow": "rgba(91,141,239,0.6)", "--tile-tint": "rgba(91,141,239,0.1)" } as React.CSSProperties}>
        {anyUploading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/70 shrink-0" />
        ) : (
          <svg className="h-5 w-5 shrink-0 text-white/50" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
        )}
        <div>
          <p className="text-sm text-[--ink]">{anyUploading ? "Przesyłam pliki…" : "Dodaj pliki"}</p>
          <p className="label-mono mt-0.5">zdjęcia · wideo · pdf</p>
        </div>
        <input ref={inputRef} type="file" multiple accept="image/*,video/*,.mov,.mp4,.m4v,.heic,.heif,application/pdf"
          className="hidden" onChange={(e) => onUpload(e.target.files)} />
      </div>
      <UploadQueue items={queue} onRetry={onRetry} />
      {files.length === 0 && queue.length === 0 && (
        <div className="surface-list px-6 py-12 text-center"><p className="text-sm text-white/30">Brak plików — prześlij pierwsze materiały powyżej.</p></div>
      )}
      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((f) => <FileCard key={f.id} f={f} isNew={f.uploaded_by === "admin" && new Date(f.created_at) > new Date(lastVisit)} />)}
        </div>
      )}
    </div>
  );
}


// ── Status tab ────────────────────────────────────────────────────────────
function StatusTab({ crm_client_id }: { crm_client_id: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/portal/projects`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { setProjects(d.projects ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [crm_client_id]);

  if (loading) return <div className="py-20 text-center"><span className="label-mono">Wczytuję…</span></div>;

  if (projects.length === 0) {
    return (
      <div className="hub-tile px-6 py-12 text-center space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06]">
          <svg className="h-7 w-7 text-white/25" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>
        </div>
        <p className="text-sm text-white/50">Brak zleceń przypisanych do Twojego konta.</p>
        <p className="label-mono">Skontaktuj się z Cosgral przez czat</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((p) => {
        const stepIdx = STATUS_INDEX[p.status] ?? 0;
        const days = daysLeft(p.deadline);
        const isUrgent = days !== null && days <= 3 && p.status !== "zakonczone";
        const isOverdue = days !== null && days < 0 && p.status !== "zakonczone";
        const waiting = p.status === "oczekuje";

        return (
          <div key={p.id} className="hub-tile p-6 space-y-5"
            style={{ "--tile-glow": waiting ? "rgba(251,191,36,0.5)" : "rgba(91,141,239,0.5)", "--tile-tint": waiting ? "rgba(251,191,36,0.06)" : "rgba(91,141,239,0.06)" } as React.CSSProperties}>
            {/* Title row */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label-mono">{SERVICE_LABELS[p.service_type] ?? p.service_type}</p>
                <h3 className="text-base font-medium text-white mt-0.5">{p.title}</h3>
              </div>
              {waiting && (
                <span className="shrink-0 rounded-full bg-amber-400/15 border border-amber-400/30 px-2.5 py-1 text-[0.65rem] font-semibold text-amber-300 uppercase tracking-wider">Czeka na Ciebie</span>
              )}
              {p.status === "zakonczone" && (
                <span className="shrink-0 rounded-full bg-green-400/15 border border-green-400/30 px-2.5 py-1 text-[0.65rem] font-semibold text-green-300 uppercase tracking-wider">Gotowe</span>
              )}
            </div>

            {/* 5-step progress timeline */}
            <div className="relative">
              <div className="absolute top-4 left-0 right-0 h-px bg-white/[0.08]" />
              <div className="flex justify-between relative">
                {STATUS_STEPS.map((step, i) => {
                  const done = i <= stepIdx;
                  const active = i === stepIdx;
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-2 flex-1">
                      <div className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-500 text-sm z-10
                        ${done
                          ? active
                            ? "border-[#5b8def] bg-[#5b8def]/20 shadow-[0_0_16px_rgba(91,141,239,0.5)]"
                            : "border-white/30 bg-white/10"
                          : "border-white/[0.08] bg-black/20"
                        }`}>
                        {done ? (
                          <svg className="h-3.5 w-3.5 text-white/70" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        ) : <span className="h-1.5 w-1.5 rounded-full bg-white/20" />}
                        {active && <span className="absolute inset-0 rounded-full animate-ping bg-[#5b8def]/20" />}
                      </div>
                      <p className={`text-[0.6rem] text-center leading-tight px-0.5 ${done ? "text-white/60" : "text-white/20"} ${active ? "text-white/90 font-medium" : ""}`}>
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Deadline & info */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {p.deadline && (
                <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
                  isOverdue ? "border-red-400/40 bg-red-400/10 text-red-300" :
                  isUrgent ? "border-amber-400/40 bg-amber-400/10 text-amber-300" :
                  "border-white/[0.1] bg-white/[0.04] text-white/50"
                }`}>
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                  </svg>
                  {isOverdue ? `${Math.abs(days!)} dni po terminie` :
                   days === 0 ? "Termin dzisiaj!" :
                   days !== null ? `Deadline za ${days} dni` : ""}
                  {" "}· {new Date(p.deadline).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}
                </div>
              )}
              {p.assigned_to && (
                <div className="flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs text-white/40">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                  Opiekun: {p.assigned_to}
                </div>
              )}
              <div className="flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs text-white/30">
                Aktualizacja: {new Date(p.updated_at).toLocaleDateString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            {waiting && (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3">
                <p className="text-sm text-amber-200/80">Cosgral oczekuje na materiały lub informacje od Ciebie. Napisz do nas przez zakładkę <strong className="text-amber-200">Czat</strong>.</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Chat panel ────────────────────────────────────────────────────────────
function ChatPanel({ messages, crm_client_id, callerName, onNewMessage }: {
  messages: PortalMessage[]; crm_client_id: string; callerName: string; onNewMessage: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Group messages by day
  const grouped: { day: string; msgs: PortalMessage[] }[] = [];
  for (const m of messages) {
    const day = fmtDay(m.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.day === day) last.msgs.push(m);
    else grouped.push({ day, msgs: [m] });
  }

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    await fetch("/api/portal/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crm_client_id, content: text.trim(), sender: "client", sender_name: callerName }),
    });
    setText(""); setSending(false); onNewMessage();
  };

  return (
    <div className="space-y-4">
      <div className="surface-list p-4 min-h-[280px] max-h-[460px] overflow-y-auto flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
            <svg className="h-8 w-8 text-white/15" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
            <p className="text-sm text-white/25">Napisz wiadomość do Cosgral</p>
            <p className="label-mono">Odpowiemy jak najszybciej</p>
          </div>
        ) : grouped.map(({ day, msgs }) => (
          <div key={day} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="label-mono text-[0.58rem] text-white/25">{day}</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
            {msgs.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "client" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] space-y-1 flex flex-col ${m.sender === "client" ? "items-end" : "items-start"}`}>
                  {m.sender === "admin" && <span className="label-mono px-1">Cosgral</span>}
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.sender === "client" ? "rounded-br-sm bg-[--ink] text-[--bg]" : "rounded-bl-sm glass text-white/85"}`}>
                    {m.content}
                  </div>
                  <span className="text-[0.55rem] text-white/20 px-1">{fmtDate(m.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-end gap-2">
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Napisz wiadomość…"
          className="glass-field flex-1 px-5 py-3 text-sm text-[--ink] placeholder-white/20 rounded-2xl"
          onKeyDown={(e) => e.key === "Enter" && void send()} />
        <button type="button" onClick={send} disabled={sending || !text.trim()}
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-[--ink] text-[--bg] transition-opacity disabled:opacity-40 hover:opacity-90">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Notes (Brief) panel ───────────────────────────────────────────────────
function NotesPanel({ notes, crm_client_id, onChanged }: {
  notes: PortalNote[]; crm_client_id: string; onChanged: () => void;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await fetch("/api/portal/notes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crm_client_id, content: text.trim() }),
    });
    setText(""); setSaving(false); onChanged();
  };
  return (
    <div className="space-y-4">
      <div className="hub-tile p-5 space-y-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-white/40 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
          <div>
            <p className="text-sm font-medium text-white/90">Brief / Notatka</p>
            <p className="label-mono">Prześlij nam dodatkowe informacje, linki lub uwagi</p>
          </div>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Np. moodboard: figma.com/... | Kolor marki: #FF5733 | Uwagi do projektu…" rows={4}
          className="glass-field w-full rounded-2xl px-4 py-3 text-sm text-[--ink] placeholder-white/20 resize-none" />
        <button type="button" onClick={save} disabled={saving || !text.trim()}
          className="rounded-full bg-[--ink] px-6 py-2.5 text-sm font-semibold text-[--bg] transition-opacity hover:opacity-90 disabled:opacity-40">
          {saving ? "Zapisuję…" : "Wyślij do Cosgral"}
        </button>
      </div>
      {notes.length === 0 ? (
        <div className="surface-list px-6 py-10 text-center"><p className="text-sm text-white/30">Brak notatek.</p></div>
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


// ── AI Assistant tab ──────────────────────────────────────────────────────
type AiMsg = { role: "user" | "assistant"; content: string };

function AiTab({ crm_client_id }: { crm_client_id: string }) {
  const [messages, setMessages] = useState<AiMsg[]>([{
    role: "assistant",
    content: "Asystent Cosgral online. Zapytaj mnie o aktualny status projektu, termin realizacji, co zostało zrobione lub czego agencja oczekuje od Ciebie.",
  }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const prior = messages.filter((m, i) => !(i === 0 && m.role === "assistant")).slice(-12);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/portal/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: prior.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Błąd AI");
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply ?? "Nie udało się uzyskać odpowiedzi." }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: err instanceof Error ? err.message : "Błąd połączenia. Spróbuj ponownie." }]);
    } finally { setBusy(false); }
  };

  const SUGGESTIONS = [
    "Kiedy będzie gotowe moje zlecenie?",
    "Co zostało już zrobione?",
    "Czego ode mnie potrzebujecie?",
    "Jaki jest aktualny etap projektu?",
  ];

  return (
    <div className="space-y-4">
      {/* AI cube visual */}
      <div className="hub-tile p-6 flex items-center gap-5"
        style={{ "--tile-glow": "rgba(91,141,239,0.6)", "--tile-tint": "rgba(91,141,239,0.1)" } as React.CSSProperties}>
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-visible rounded-2xl border border-white/15 bg-black/40">
          <span className="absolute inset-[-18%]"><CosgralChatCube dimmed={false} /></span>
        </div>
        <div>
          <h3 className="text-base font-medium text-white">Asystent AI Cosgral</h3>
          <p className="label-mono mt-0.5">Zadaj pytanie o swój projekt</p>
          <p className="text-xs text-white/35 mt-1">Zna status, termin i ostatnią komunikację z Twoim zespołem Cosgral</p>
        </div>
      </div>

      {/* Suggestion chips */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs text-white/50 transition hover:bg-white/[0.08] hover:text-white/80">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Chat messages */}
      <div className="surface-list p-4 min-h-[220px] max-h-[380px] overflow-y-auto flex flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] space-y-1 flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
              {m.role === "assistant" && (
                <div className="flex items-center gap-1.5 px-1">
                  <div className="h-4 w-4 rounded-full bg-[#5b8def]/30 border border-[#5b8def]/50 flex items-center justify-center">
                    <span className="text-[0.5rem]">AI</span>
                  </div>
                  <span className="label-mono text-[0.58rem]">Asystent Cosgral</span>
                </div>
              )}
              <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "rounded-br-sm bg-[--ink] text-[--bg]" : "rounded-bl-sm glass text-white/85"}`}>
                {m.content}
              </div>
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="glass rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0,1,2].map((i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-end gap-2">
        <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Zapytaj o projekt…"
          className="glass-field flex-1 px-5 py-3 text-sm text-[--ink] placeholder-white/20 rounded-2xl"
          onKeyDown={(e) => e.key === "Enter" && void send()} />
        <button type="button" onClick={send} disabled={busy || !input.trim()}
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-[#5b8def] text-white transition-opacity disabled:opacity-40 hover:opacity-90">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Push Notifications tab ────────────────────────────────────────────────
function NotificationsTab() {
  type PushState = "loading" | "unsupported" | "need-install" | "need-https" | "ready" | "enabled" | "denied" | "missing-vapid";
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [publicKey, setPublicKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!window.isSecureContext && location.hostname !== "localhost") { setState("need-https"); return; }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState(isIos() && !isStandalone() ? "need-install" : "unsupported"); return;
    }
    if (isIos() && !isStandalone()) { setState("need-install"); return; }
    try {
      const res = await fetch("/api/portal/push/subscribe", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!data.configured || !data.publicKey) { setState("missing-vapid"); return; }
      setPublicKey(data.publicKey as string);
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      setState(Notification.permission === "denied" ? "denied" : existing ? "enabled" : "ready");
    } catch { setState("unsupported"); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const enable = async () => {
    if (!publicKey) return;
    setBusy(true); setMsg("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState("denied"); setMsg("Odmówiono powiadomień w ustawieniach."); setBusy(false); return; }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const res = await fetch("/api/portal/push/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setMsg(typeof d.error === "string" ? d.error : "Błąd zapisu"); setBusy(false); return; }
      setState("enabled");
      setMsg("Gotowe — dostaniesz powiadomienie gdy Cosgral wyśle Ci wiadomość.");
    } catch (err) { setMsg(err instanceof Error ? err.message : "Błąd włączania push"); }
    setBusy(false);
  };

  const disable = async () => {
    setBusy(true); setMsg("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/portal/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState("ready"); setMsg("Wyłączono powiadomienia na tym urządzeniu.");
    } catch { setMsg("Nie udało się wyłączyć."); }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="hub-tile p-6 space-y-5" style={{ "--tile-glow": state === "enabled" ? "rgba(34,197,94,0.5)" : "rgba(91,141,239,0.5)", "--tile-tint": "rgba(91,141,239,0.06)" } as React.CSSProperties}>
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${state === "enabled" ? "bg-green-400/10" : "bg-white/[0.06]"}`}>
            {state === "enabled" ? (
              <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>
            ) : (
              <svg className="h-5 w-5 text-white/30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.143 17.082a24.248 24.248 0 0 0 3.714 0m-3.714 0a3 3 0 1 1-3.143-2.857M9.143 17.082c-.236-1.064-.428-2.139-.566-3.216m0 0A12.034 12.034 0 0 1 8.25 9a3.75 3.75 0 0 1 7.5 0c0 1.624-.31 3.176-.857 4.573m0 0c.286-.16.578-.318.864-.47M18 12a3.75 3.75 0 0 1-3.75 3.75 3.75 3.75 0 0 1 3.75-3.75" /></svg>
            )}
          </div>
          <div>
            <p className="text-base font-medium text-white">Powiadomienia push</p>
            <p className="label-mono mt-0.5">
              {state === "enabled" ? "Włączone na tym urządzeniu" :
               state === "need-install" ? "Dodaj do ekranu głównego" :
               state === "denied" ? "Zablokowane w ustawieniach" :
               state === "missing-vapid" ? "Niezakonfigurowane" :
               state === "ready" ? "Gotowe do włączenia" : "Sprawdzam…"}
            </p>
          </div>
          <div className={`ml-auto flex h-2.5 w-2.5 rounded-full ${state === "enabled" ? "bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)]" : "bg-white/20"}`} />
        </div>

        <div className="h-px bg-white/[0.06]" />

        {state === "need-install" && (
          <div className="space-y-3 text-sm text-white/55">
            <p className="font-medium text-white/70">Aby włączyć powiadomienia na iPhone:</p>
            <ol className="space-y-2">
              <li>1. Otwórz ten link w <strong className="text-white/85">Safari</strong> (nie Chrome)</li>
              <li>2. Kliknij ikonę <strong className="text-white/85">Udostępnij</strong> → <strong className="text-white/85">Do ekranu głównego</strong></li>
              <li>3. Otwórz aplikację z ekranu i wróć tu</li>
            </ol>
          </div>
        )}

        {state === "denied" && <p className="text-sm text-white/55">Włącz powiadomienia w: Ustawienia → Powiadomienia → Cosgral Hub → Zezwól.</p>}

        {(state === "ready" || state === "enabled") && (
          <p className="text-sm text-white/55">Dostaniesz powiadomienie gdy Cosgral wyśle Ci wiadomość, doda plik lub zmieni status Twojego zlecenia. Działa na iPhone, Android, Mac i PC.</p>
        )}

        <div className="flex flex-wrap gap-2">
          {state === "ready" && (
            <button type="button" disabled={busy} onClick={() => void enable()}
              className="rounded-full bg-[--ink] px-5 py-2.5 text-sm font-semibold text-[--bg] transition-opacity hover:opacity-90 disabled:opacity-40">
              {busy ? "…" : "Włącz powiadomienia"}
            </button>
          )}
          {state === "enabled" && (
            <button type="button" disabled={busy} onClick={() => void disable()}
              className="rounded-full border border-white/[0.12] bg-white/[0.06] px-5 py-2.5 text-sm text-white/60 transition hover:text-white/90 disabled:opacity-40">
              {busy ? "…" : "Wyłącz na tym urządzeniu"}
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => void refresh()}
            className="rounded-full border border-white/[0.1] bg-transparent px-4 py-2.5 text-xs text-white/35 transition hover:text-white/60">
            Odśwież status
          </button>
        </div>
        {msg && <p className="text-sm text-white/50">{msg}</p>}
      </div>

      {/* Devices grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "iPhone / iPad", note: "iOS 16.4+ Safari PWA" },
          { label: "Android", note: "Chrome / Firefox" },
          { label: "macOS Safari", note: "Safari 16+" },
          { label: "Windows / Mac", note: "Chrome / Edge" },
        ].map((d) => (
          <div key={d.label} className="hub-tile p-4 text-center space-y-1.5">
            <p className="text-xs font-medium text-white/70">{d.label}</p>
            <p className="label-mono">{d.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}


// ── AI overlay modal ──────────────────────────────────────────────────────
function AiModal({ crm_client_id, onClose }: { crm_client_id: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[120]">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" aria-label="Zamknij" onClick={onClose} />
      <div className="absolute inset-x-4 bottom-4 top-4 mx-auto max-w-lg flex flex-col gap-0 rounded-3xl border border-white/[0.1] bg-[#060606]/95 backdrop-blur-xl shadow-[0_32px_80px_rgba(0,0,0,0.7)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center overflow-visible rounded-xl border border-white/15 bg-black/40">
              <span className="absolute inset-[-20%]"><CosgralChatCube dimmed={false} /></span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Asystent AI</p>
              <p className="text-[0.6rem] text-white/30">Wie wszystko o Twoim projekcie</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-white/30 hover:bg-white/[0.08] hover:text-white/70 transition-colors">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-hidden p-4">
          <AiTab crm_client_id={crm_client_id} />
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────
type PortalTab = "pliki" | "status" | "czat" | "brief" | "ai" | "powiadomienia";

function PortalDashboard({ slug, companyName, crm_client_id, callerName, onLogout }: {
  slug: string; companyName: string; crm_client_id: string; callerName: string;
  onLogout: () => void;
}) {
  const [files, setFiles] = useState<PortalFile[]>([]);
  const [notes, setNotes] = useState<PortalNote[]>([]);
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [tab, setTab] = useState<PortalTab>("pliki");
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [aiOpen, setAiOpen] = useState(false);
  const [lastVisit] = useState(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("portal_last_visit") : null;
    const now = new Date().toISOString();
    if (typeof window !== "undefined") localStorage.setItem("portal_last_visit", now);
    return stored ?? new Date(0).toISOString();
  });

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

  // Upload handlers
  const handleRetry = (item: UploadItem) => {
    setQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: "pending", progress: 0, error: undefined } : i));
    const dt = new DataTransfer();
    dt.items.add(item.file);
    void handleUpload(dt.files);
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newItems: UploadItem[] = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(), file, progress: 0, status: "pending" as const,
    }));
    setQueue((q) => [...q, ...newItems]);
    for (const item of newItems) {
      setQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: "uploading" } : i));
      try {
        const controller = new AbortController();
        const { gdrive_file_id, gdrive_folder_id } = await uploadFileToDrive(
          item.file, crm_client_id,
          (pct) => setQueue((q) => q.map((i) => i.id === item.id ? { ...i, progress: pct } : i)),
          controller.signal,
        );
        const completeRes = await fetch("/api/portal/gdrive-complete", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gdrive_file_id, gdrive_folder_id, file_name: item.file.name, mime_type: item.file.type || "application/octet-stream", size_bytes: item.file.size, crm_client_id }),
        });
        if (!completeRes.ok) { const errData = await completeRes.json().catch(() => ({})); throw new Error(errData.error ?? `Błąd zapisu (${completeRes.status})`); }
        setQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: "done", progress: 100 } : i));
      } catch (err) {
        const msgErr = err instanceof Error ? err.message : "Nieznany błąd";
        setQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: "error", error: msgErr } : i));
      }
    }
    await loadAll();
    setTimeout(() => setQueue((q) => q.filter((i) => i.status !== "done")), 3000);
  };

  const newFilesCount = files.filter((f) => f.uploaded_by === "admin" && new Date(f.created_at) > new Date(lastVisit)).length;
  const unreadMessages = messages.filter((m) => m.sender === "admin" && new Date(m.created_at) > new Date(lastVisit)).length;

  const TABS: { id: PortalTab; label: string; badge?: number }[] = [
    { id: "pliki", label: "Pliki", badge: newFilesCount || undefined },
    { id: "status", label: "Status" },
    { id: "czat", label: "Czat", badge: unreadMessages || undefined },
    { id: "brief", label: "Brief" },
    { id: "ai", label: "AI" },
    { id: "powiadomienia", label: "Alerty" },
  ];

  return (
    <div className="relative min-h-screen text-[--ink]">
      <CosgralAmbient />
      <PortalHeader
        companyName={companyName}
        callerName={callerName}
        onLogout={onLogout}
        onAiOpen={() => setAiOpen(true)}
      />

      <div className="relative z-10 mx-auto max-w-2xl px-4 pt-20 pb-24">

        {/* Hero tile */}
        <div className="hub-tile p-6 mb-5 flex items-center gap-5"
          style={{ "--tile-glow": "rgba(91,141,239,0.6)", "--tile-tint": "rgba(91,141,239,0.1)" } as React.CSSProperties}>
          <div className="flex-1 min-w-0">
            <p className="label-mono mb-0.5">Katalog klienta</p>
            <h1 className="text-xl font-light tracking-tight">{companyName}</h1>
            <p className="text-xs text-white/30 mt-1 truncate">Zalogowany jako: {callerName}</p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
            <div className="text-right">
              <p className="label-mono">pliki</p>
              <p className="text-xl font-light">{files.length}</p>
            </div>
          </div>
        </div>

        {/* Scrollable tab bar */}
        <div className="mb-5 flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                tab === t.id ? "bg-[--ink] text-[--bg] shadow-sm" : "glass text-white/45 hover:text-white/70"
              }`}>
              <span>{t.label}</span>
              {t.badge != null && t.badge > 0 && (
                <span className={`flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[0.55rem] font-bold ${tab === t.id ? "bg-[--bg]/20 text-[--bg]" : "bg-[#5b8def] text-white"}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "pliki" && <FileGrid files={files} queue={queue} onUpload={handleUpload} onRetry={handleRetry} lastVisit={lastVisit} />}
        {tab === "status" && <StatusTab crm_client_id={crm_client_id} />}
        {tab === "czat" && <ChatPanel messages={messages} crm_client_id={crm_client_id} callerName={callerName} onNewMessage={loadChat} />}
        {tab === "brief" && <NotesPanel notes={notes} crm_client_id={crm_client_id} onChanged={loadAll} />}
        {tab === "ai" && <AiTab crm_client_id={crm_client_id} />}
        {tab === "powiadomienia" && <NotificationsTab />}
      </div>

      <footer className="relative z-10 border-t border-white/[0.06] py-5 flex justify-center">
        <CosgralBrand size={16} subtitle="Hub" />
      </footer>

      {/* Floating AI modal */}
      {aiOpen && <AiModal crm_client_id={crm_client_id} onClose={() => setAiOpen(false)} />}
    </div>
  );
}

// ── Main orchestrator ─────────────────────────────────────────────────────
type ViewState =
  | { phase: "loading" }
  | { phase: "not_found" }
  | { phase: "setup_auth"; companyName: string }
  | { phase: "login"; companyName: string }
  | { phase: "dashboard"; companyName: string; crm_client_id: string; callerName: string };

export default function PortalPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [view, setView] = useState<ViewState>({ phase: "loading" });

  useEffect(() => {
    async function init() {
      // 1. Check existing session
      const sessionRes = await fetch("/api/portal/session");
      const sessionData = await sessionRes.json();
      if (sessionData.authenticated) {
        const res = await fetch(`/api/portal/${slug}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) { setView({ phase: "not_found" }); return; }
        setView({ phase: "dashboard", companyName: data.client.company_name, crm_client_id: data.client.id, callerName: sessionData.requester_name ?? "Klient" });
        return;
      }
      // 2. Resolve slug
      const slugRes = await fetch(`/api/portal/${slug}`, { cache: "no-store" });
      if (!slugRes.ok) { setView({ phase: "not_found" }); return; }
      const slugData = await slugRes.json();
      const companyName: string = slugData.client?.company_name ?? slug.replace(/-[a-z0-9]{4}$/, "").replace(/-/g, " ");
      // 3. Has auth?
      const authRes = await fetch(`/api/portal/check-auth?slug=${encodeURIComponent(slug)}`);
      const authData = await authRes.json();
      setView(authData.has_auth ? { phase: "login", companyName } : { phase: "setup_auth", companyName });
    }
    void init();
  }, [slug]);

  const handleAuthDone = (token: string, crm_client_id: string, username: string, companyName: string) => {
    setView({ phase: "dashboard", companyName, crm_client_id, callerName: username });
  };

  const handleLogout = async () => {
    await fetch("/api/portal/logout", { method: "POST" });
    document.cookie = "portal_session=;path=/;max-age=0";
    setView({ phase: "loading" });
    // Re-init to show login
    const slugRes = await fetch(`/api/portal/${slug}`, { cache: "no-store" });
    const slugData = await slugRes.json();
    const companyName: string = slugData.client?.company_name ?? slug;
    setView({ phase: "login", companyName });
  };

  if (view.phase === "loading") return <LoadingScreen />;

  if (view.phase === "not_found") {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center">
        <CosgralAmbient />
        <div className="relative z-10 hub-tile p-10 max-w-sm w-full space-y-4">
          <CosgralBrand size={28} subtitle="Hub" className="justify-center" />
          <div className="h-px bg-white/[0.08]" />
          <h1 className="text-xl font-light text-[--ink]">Nie znaleziono katalogu</h1>
          <p className="text-sm text-white/40">Sprawdź link który otrzymałeś od Cosgral.</p>
        </div>
      </div>
    );
  }

  if (view.phase === "setup_auth") {
    return <SetupAuthView slug={slug} companyName={view.companyName}
      onDone={(token, crm_client_id, username) => handleAuthDone(token, crm_client_id, username, view.companyName)} />;
  }

  if (view.phase === "login") {
    return <LoginView slug={slug} companyName={view.companyName}
      onDone={(token, crm_client_id, username) => handleAuthDone(token, crm_client_id, username, view.companyName)} />;
  }

  return <PortalDashboard slug={slug} companyName={view.companyName} crm_client_id={view.crm_client_id} callerName={view.callerName} onLogout={handleLogout} />;
}

