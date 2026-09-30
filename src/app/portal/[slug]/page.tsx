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
function isGdrive(f: PortalFile) { return f.storage_provider === "gdrive" || !!f.gdrive_file_id; }

// ── Upload logic (Google Drive Resumable — chunked 5 MB) ──────────────────
interface UploadItem {
  id: string;          // temp id
  file: File;
  progress: number;    // 0-100
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

/**
 * Send file in 5 MB chunks to a Google Drive resumable session URI.
 *
 * Key fixes:
 *  - Intermediate chunks use Content-Range: bytes start-end/* (no total declared)
 *    → avoids 400 error when iOS transcodes HEVC video (size may differ)
 *  - Final chunk: bytes start-end/total (required by Google)
 *  - 5-minute timeout per chunk
 *  - One automatic retry per chunk on network/timeout error
 */
async function uploadChunked(
  uploadUri: string,
  file: File,
  mimeType: string,
  onProgress: (pct: number) => void,
  signal: AbortSignal,
): Promise<string> {
  const CHUNK = 5 * 1024 * 1024; // 5 MB — multiple of 256 KB (Google requirement)
  const total = file.size;
  let offset = 0;

  const sendChunk = (start: number, end: number, isLast: boolean): Promise<string | null> =>
    new Promise((resolve, reject) => {
      const chunk = file.slice(start, end);
      // Use `*` for intermediate chunks — avoids size-mismatch 400 on iOS
      const rangeHeader = isLast
        ? `bytes ${start}-${end - 1}/${total}`
        : `bytes ${start}-${end - 1}/*`;

      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUri);
      xhr.timeout = 5 * 60 * 1000; // 5-minute timeout per chunk
      xhr.setRequestHeader("Content-Type", mimeType);
      xhr.setRequestHeader("Content-Range", rangeHeader);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.min(95, Math.round(((start + e.loaded) / total) * 95)));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const resp = JSON.parse(xhr.responseText) as { id?: string };
            onProgress(100);
            resolve(resp.id ?? "");
          } catch {
            reject(new Error("Nieprawidłowa odpowiedź serwera"));
          }
        } else if (xhr.status === 308) {
          resolve(null); // chunk OK, continue
        } else {
          reject(new Error(`Błąd ${xhr.status}: ${xhr.statusText || "nieznany"}`));
        }
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

    // Auto-retry once on network/timeout error
    let fileId: string | null;
    try {
      fileId = await sendChunk(offset, end, isLast);
    } catch (err) {
      if (err instanceof Error && err.message === "Anulowano") throw err;
      // Wait 2s then retry
      await new Promise((r) => setTimeout(r, 2000));
      fileId = await sendChunk(offset, end, isLast);
    }

    if (fileId !== null) return fileId;
    offset = end;
  }

  throw new Error("Upload zakończony bez ID pliku");
}

async function uploadFileToDrive(
  file: File,
  crm_client_id: string,
  onProgress: (pct: number) => void,
  signal: AbortSignal
): Promise<{ gdrive_file_id: string; gdrive_folder_id: string }> {
  // Resolve MIME
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

  // Step 1: get resumable URI from our API (does NOT send file to Netlify)
  const initRes = await fetch("/api/portal/gdrive-init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_name: file.name, mime_type: mimeType, size_bytes: file.size, crm_client_id }),
    signal,
  });
  if (!initRes.ok) {
    const err = await initRes.json().catch(() => ({}));
    throw new Error(err.error ?? `Błąd inicjalizacji (${initRes.status})`);
  }
  const { uploadUri, folderId } = await initRes.json() as { uploadUri: string; folderId: string };

  // Step 2: upload in 5 MB chunks directly to Google (browser → Google, bypasses Netlify)
  const fileId = await uploadChunked(uploadUri, file, mimeType, onProgress, signal);

  return { gdrive_file_id: fileId, gdrive_folder_id: folderId };
}

// ── Ambient background ────────────────────────────────────────────────────
function PortalAmbient() {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 opacity-[0.07] mix-blend-overlay"
        style={{ backgroundImage: "url('/cosgral/charcoal-grain.jpg')", backgroundSize: "280px" }} />
      <div aria-hidden className="pointer-events-none fixed z-0"
        style={{ top: "-20vh", left: "-15vw", width: "70vmax", height: "70vmax", borderRadius: "50%",
          background: "radial-gradient(circle closest-side, rgba(91,141,239,0.13) 0%, transparent 70%)" }} />
      <div aria-hidden className="pointer-events-none fixed z-0"
        style={{ bottom: "-20vh", right: "-15vw", width: "60vmax", height: "60vmax", borderRadius: "50%",
          background: "radial-gradient(circle closest-side, rgba(255,255,255,0.06) 0%, transparent 70%)" }} />
    </>
  );
}

// ── TopBar ────────────────────────────────────────────────────────────────
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

// ── Loading ───────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[--bg]">
      <PortalAmbient />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <CosgralBrand size={32} subtitle="Hub" />
        <div className="h-px w-32 overflow-hidden rounded-full bg-white/[0.08]">
          <div className="h-full w-1/2 rounded-full bg-white/40"
            style={{ animation: "slide 1.4s ease-in-out infinite" }} />
        </div>
      </div>
    </div>
  );
}

// ── Request Access ────────────────────────────────────────────────────────
function RequestAccessView({ slug, companyName, onRequested }: {
  slug: string; companyName: string; onRequested: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim()) { setError("Podaj imię i nazwisko"); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/portal/request-access", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, requester_name: name.trim(), requester_email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Błąd — spróbuj ponownie"); return; }
      onRequested(data.request_id);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="relative min-h-screen bg-[--bg] flex flex-col items-center justify-center px-5 py-20">
      <PortalAmbient />
      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="hub-tile p-8 space-y-6">
          <CosgralBrand size={28} subtitle="Hub" />
          <div className="space-y-1">
            <p className="label-mono">Materiały klienta</p>
            <h1 className="text-2xl font-light tracking-tight text-[--ink]">{companyName}</h1>
          </div>
          <div className="h-px bg-white/[0.08]" />
          <p className="text-sm leading-relaxed text-white/50">
            Podaj swoje imię — Cosgral otrzyma powiadomienie i w ciągu chwili zatwierdzi dostęp.
          </p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="label-mono">Imię i nazwisko</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Jan Kowalski" autoFocus
                className="glass-field w-full px-5 py-3 text-sm text-[--ink] placeholder-white/20 rounded-2xl"
                onKeyDown={(e) => e.key === "Enter" && void submit()} />
            </div>
            <div className="space-y-1.5">
              <label className="label-mono">Email <span className="normal-case text-white/20">(opcjonalnie)</span></label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="jan@firma.pl"
                className="glass-field w-full px-5 py-3 text-sm text-[--ink] placeholder-white/20 rounded-2xl"
                onKeyDown={(e) => e.key === "Enter" && void submit()} />
            </div>
            {error && <p className="text-xs text-red-400/90">{error}</p>}
          </div>
          <button type="button" onClick={submit} disabled={submitting || !name.trim()}
            className="w-full rounded-full bg-[--ink] py-3.5 text-sm font-semibold text-[--bg] transition-opacity hover:opacity-90 disabled:opacity-40">
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

// ── Waiting ───────────────────────────────────────────────────────────────
function WaitingView({ requestId, companyName, onApproved }: {
  requestId: string; companyName: string; onApproved: (token: string) => void;
}) {
  const [dots, setDots] = useState(0);
  useEffect(() => { const id = setInterval(() => setDots((d) => (d + 1) % 4), 500); return () => clearInterval(id); }, []);
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/portal/approve/${requestId}`);
        const data = await res.json();
        if (data.status === "approved" && data.token) {
          document.cookie = `portal_session=${data.token};path=/;max-age=${60 * 60 * 24 * 30};samesite=lax`;
          onApproved(data.token);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(id);
  }, [requestId, onApproved]);

  return (
    <div className="relative min-h-screen bg-[--bg] flex flex-col items-center justify-center px-5">
      <PortalAmbient />
      <div className="relative z-10 w-full max-w-sm">
        <div className="hub-tile p-10 text-center space-y-8">
          <CosgralBrand size={28} subtitle="Hub" className="justify-center" />
          <div className="mx-auto flex h-20 w-20 items-center justify-center relative">
            <div className="absolute h-20 w-20 animate-ping rounded-full bg-white/[0.06]" />
            <div className="relative h-12 w-12 rounded-full surface flex items-center justify-center">
              <div className="h-4 w-4 rounded-full bg-white/40" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-light text-[--ink]">Prośba wysłana<span className="text-white/30">{".".repeat(dots)}</span></h2>
            <p className="text-sm text-white/40">Cosgral otrzymał powiadomienie.<br />Po zatwierdzeniu dostęp otworzy się automatycznie.</p>
            <p className="label-mono mt-2">{companyName}</p>
          </div>
          <p className="text-[0.6rem] text-white/15">Możesz zostawić tę kartę otwartą.</p>
        </div>
      </div>
    </div>
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
            <span className="label-mono">
              {item.status === "done" ? "✓ gotowe" :
               item.status === "error" ? "błąd" :
               item.status === "pending" ? "czekam…" :
               `${item.progress}%`}
            </span>
          </div>
          {item.status === "uploading" && (
            <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${item.progress}%`,
                  background: "linear-gradient(90deg, rgba(91,141,239,0.8) 0%, rgba(255,255,255,0.6) 100%)",
                }}
              />
            </div>
          )}
          {item.status === "done" && (
            <div className="h-1 rounded-full bg-white/20">
              <div className="h-full w-full rounded-full bg-[--ink]/40" />
            </div>
          )}
          {item.status === "error" && (
            <div className="space-y-1.5">
              <p className="text-xs text-red-400/80">{item.error}</p>
              <button
                type="button"
                onClick={() => onRetry(item)}
                className="text-xs text-white/50 underline hover:text-white/80 transition-colors"
              >
                ↺ Spróbuj ponownie
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── File card ─────────────────────────────────────────────────────────────
function FileCard({ f }: { f: PortalFile }) {
  const [showPreview, setShowPreview] = useState(false);
  const gdrive = isGdrive(f);
  const embedUrl = gdrive && f.gdrive_file_id
    ? `https://drive.google.com/file/d/${f.gdrive_file_id}/preview`
    : f.public_url;
  const thumbUrl = gdrive && f.gdrive_file_id
    ? `https://drive.google.com/thumbnail?id=${f.gdrive_file_id}&sz=w400`
    : null;
  const viewUrl = gdrive && f.gdrive_file_id
    ? `https://drive.google.com/file/d/${f.gdrive_file_id}/view`
    : f.public_url;

  return (
    <div className="hub-tile overflow-hidden group">
      {/* Thumbnail / preview area */}
      <div
        className="relative aspect-video w-full cursor-pointer bg-black/30"
        onClick={() => setShowPreview((s) => !s)}
      >
        {isImage(f.mime_type) && (thumbUrl || f.public_url) ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={thumbUrl ?? f.public_url!}
            alt={f.file_name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : isVideo(f.mime_type) ? (
          showPreview && embedUrl ? (
            <iframe
              src={embedUrl}
              className="h-full w-full border-0"
              allow="autoplay"
              allowFullScreen
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center gap-3 flex-col">
              {thumbUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={thumbUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
              ) : null}
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                <svg className="h-5 w-5 translate-x-0.5 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
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
            <a href={viewUrl} target="_blank" rel="noopener noreferrer"
              className="text-white/30 hover:text-white/70 transition-colors"
              onClick={(e) => e.stopPropagation()}>
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
function FileGrid({ files, queue, onUpload, onRetry }: {
  files: PortalFile[];
  queue: UploadItem[];
  onUpload: (f: FileList | null) => void;
  onRetry: (item: UploadItem) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const anyUploading = queue.some((q) => q.status === "uploading" || q.status === "pending");

  return (
    <div className="space-y-4">
      {/* Upload trigger tile */}
      <div
        onClick={() => inputRef.current?.click()}
        className="hub-tile group flex cursor-pointer items-center gap-4 px-5 py-4"
        style={{ "--tile-glow": "rgba(91,141,239,0.6)", "--tile-tint": "rgba(91,141,239,0.1)" } as React.CSSProperties}
      >
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
        <input ref={inputRef} type="file" multiple
          accept="image/*,video/*,.mov,.mp4,.m4v,.heic,.heif,application/pdf"
          className="hidden" onChange={(e) => onUpload(e.target.files)} />
      </div>

      {/* Active upload queue with progress bars */}
      <UploadQueue items={queue} onRetry={handleRetry} />

      {files.length === 0 && queue.length === 0 && (
        <div className="surface-list px-6 py-12 text-center">
          <p className="text-sm text-white/30">Brak plików — prześlij pierwsze materiały powyżej.</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((f) => <FileCard key={f.id} f={f} />)}
        </div>
      )}
    </div>
  );
}

// ── Notes panel ───────────────────────────────────────────────────────────
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
        <p className="label-mono">Nowa notatka</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Wpisz treść notatki…" rows={4}
          className="glass-field w-full rounded-2xl px-4 py-3 text-sm text-[--ink] placeholder-white/20 resize-none" />
        <button type="button" onClick={save} disabled={saving || !text.trim()}
          className="rounded-full bg-[--ink] px-6 py-2.5 text-sm font-semibold text-[--bg] transition-opacity hover:opacity-90 disabled:opacity-40">
          {saving ? "Zapisuję…" : "Zapisz notatkę"}
        </button>
      </div>
      {notes.length === 0 ? (
        <div className="surface-list px-6 py-12 text-center"><p className="text-sm text-white/30">Brak notatek.</p></div>
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
  messages: PortalMessage[]; crm_client_id: string; callerName: string; onNewMessage: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
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
      <div className="surface-list p-4 min-h-[260px] max-h-[420px] overflow-y-auto flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
            <svg className="h-8 w-8 text-white/15" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
            <p className="text-sm text-white/25">Napisz wiadomość do Cosgral</p>
            <p className="label-mono">Odpowiemy jak najszybciej</p>
          </div>
        ) : messages.map((m) => (
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

// ── Dashboard ─────────────────────────────────────────────────────────────
type PortalTab = "pliki" | "notatki" | "czat";

function PortalDashboard({ slug, companyName, crm_client_id, callerName }: {
  slug: string; companyName: string; crm_client_id: string; callerName: string;
}) {
  const [files, setFiles] = useState<PortalFile[]>([]);
  const [notes, setNotes] = useState<PortalNote[]>([]);
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [tab, setTab] = useState<PortalTab>("pliki");
  const [queue, setQueue] = useState<UploadItem[]>([]);

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

  // ── Google Drive upload with progress ──────────────────────────────────

  // Retry a single failed item
  const handleRetry = (item: UploadItem) => {
    // Reset item to pending
    setQueue((q) =>
      q.map((i) => i.id === item.id ? { ...i, status: "pending", progress: 0, error: undefined } : i)
    );
    // Re-use the existing upload flow via a synthetic single-file list
    const dt = new DataTransfer();
    dt.items.add(item.file);
    void handleUpload(dt.files);
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newItems: UploadItem[] = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: "pending" as const,
    }));
    setQueue((q) => [...q, ...newItems]);

    for (const item of newItems) {
      // Mark as uploading
      setQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: "uploading" } : i));

      try {
        const controller = new AbortController();
        const { gdrive_file_id, gdrive_folder_id } = await uploadFileToDrive(
          item.file,
          crm_client_id,
          (pct) => setQueue((q) => q.map((i) => i.id === item.id ? { ...i, progress: pct } : i)),
          controller.signal
        );

        // Register in Supabase — check for errors explicitly
        const completeRes = await fetch("/api/portal/gdrive-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gdrive_file_id,
            gdrive_folder_id,
            file_name: item.file.name,
            mime_type: item.file.type || "application/octet-stream",
            size_bytes: item.file.size,
            crm_client_id,
          }),
        });
        if (!completeRes.ok) {
          const errData = await completeRes.json().catch(() => ({}));
          throw new Error(errData.error ?? `Błąd zapisu (${completeRes.status})`);
        }

        setQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: "done", progress: 100 } : i));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Nieznany błąd";
        setQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: "error", error: msg } : i));
      }
    }

    // Refresh file list and clear done items after a moment
    await loadAll();
    setTimeout(() => setQueue((q) => q.filter((i) => i.status !== "done")), 3000);
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

        {/* Header tile */}
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

        {/* Pill tabs */}
        <div className="glass-pill mb-6 flex gap-1 rounded-full p-1">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-medium transition-all duration-200 ${
                tab === t.id ? "bg-[--ink] text-[--bg] shadow-sm" : "text-white/45 hover:text-white/70"
              }`}>
              {t.label}
              {t.count > 0 && (
                <span className={`text-[0.58rem] ${tab === t.id ? "text-[--bg]/50" : "text-white/25"}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {tab === "pliki"   && <FileGrid files={files} queue={queue} onUpload={handleUpload} onRetry={handleRetry} />}
        {tab === "notatki" && <NotesPanel notes={notes} crm_client_id={crm_client_id} onChanged={loadAll} />}
        {tab === "czat"    && <ChatPanel messages={messages} crm_client_id={crm_client_id} callerName={callerName} onNewMessage={loadChat} />}
      </div>

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
        setView({ phase: "dashboard", companyName: data.client.company_name, crm_client_id: data.client.id, callerName: sessionData.requester_name ?? "Klient" });
        return;
      }
      const slugRes = await fetch(`/api/portal/${slug}`, { cache: "no-store" });
      if (slugRes.status === 401) {
        const friendly = slug.replace(/-[a-z0-9]{4}$/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
          <p className="text-sm text-white/40">Sprawdź link który otrzymałeś od Cosgral.</p>
        </div>
      </div>
    );
  }

  if (view.phase === "request_access") {
    return <RequestAccessView slug={slug} companyName={view.companyName}
      onRequested={(requestId) => setView({ phase: "waiting", requestId, companyName: view.companyName })} />;
  }

  if (view.phase === "waiting") {
    return <WaitingView requestId={view.requestId} companyName={view.companyName}
      onApproved={async () => {
        const res = await fetch(`/api/portal/${slug}`, { cache: "no-store" });
        const data = await res.json();
        setView({ phase: "dashboard", companyName: view.companyName, crm_client_id: data.client?.id ?? "", callerName: "Klient" });
      }} />;
  }

  return <PortalDashboard slug={slug} companyName={view.companyName} crm_client_id={view.crm_client_id} callerName={view.callerName} />;
}
