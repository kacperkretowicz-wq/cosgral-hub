"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/CrmUi";
import { Button } from "@/components/ui/Button";
import { CatalogShareModal } from "@/components/CatalogShareModal";
import type { PortalFile, PortalNote, PortalMessage, PortalAccessRequest } from "@/lib/portal-db";

// ── helpers ───────────────────────────────────────────────────────────────

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pl-PL", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function isImage(mime: string) {
  return mime.startsWith("image/");
}
function isVideo(mime: string) {
  return mime.startsWith("video/");
}

// ── FileGrid ─────────────────────────────────────────────────────────────

function FileGrid({
  files,
  onDelete,
}: {
  files: PortalFile[];
  onDelete: (id: string) => void;
}) {
  const [previewId, setPreviewId] = useState<string | null>(null);

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-dashed border-white/15 py-12">
        <p className="label-mono opacity-40">Brak plików — przeciągnij lub kliknij Wgraj</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {files.map((f) => {
        const isGdrive = !!f.gdrive_file_id;
        const viewUrl = isGdrive
          ? `https://drive.google.com/file/d/${f.gdrive_file_id}/view`
          : f.public_url;
        const embedUrl = isGdrive
          ? `https://drive.google.com/file/d/${f.gdrive_file_id}/preview`
          : f.public_url;
        const thumbUrl = isGdrive
          ? `https://drive.google.com/thumbnail?id=${f.gdrive_file_id}&sz=w400`
          : null;
        const downloadUrl = isGdrive
          ? `https://drive.google.com/uc?export=download&id=${f.gdrive_file_id}`
          : f.public_url;

        return (
          <div key={f.id} className="hub-tile group overflow-hidden">
            {/* Preview */}
            <div
              className="relative aspect-video w-full cursor-pointer bg-black/30"
              onClick={() => isVideo(f.mime_type) && setPreviewId(previewId === f.id ? null : f.id)}
            >
              {isImage(f.mime_type) ? (
                <a href={viewUrl ?? "#"} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbUrl ?? f.public_url ?? ""}
                    alt={f.file_name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </a>
              ) : isVideo(f.mime_type) ? (
                previewId === f.id && embedUrl ? (
                  isGdrive ? (
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
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 relative">
                    {thumbUrl && <img src={thumbUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
                    <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                      <svg className="h-4 w-4 translate-x-0.5 text-white/80" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                    <span className="relative z-10 label-mono text-white/40 text-[0.55rem]">kliknij aby odtworzyć</span>
                  </div>
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-3xl opacity-40">
                    {f.mime_type === "application/pdf" ? "📄" : "📁"}
                  </span>
                </div>
              )}
            </div>

            {/* Info bar */}
            <div className="px-3 py-2 space-y-1">
              <p className="truncate text-[0.65rem] text-white/70">{f.file_name}</p>
              <div className="flex items-center justify-between gap-1">
                <span className="label-mono text-[0.55rem]">{fmtSize(f.size_bytes)}</span>
                <div className="flex items-center gap-1.5">
                  {/* Download */}
                  {downloadUrl && (
                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer"
                      title="Pobierz" className="text-white/30 hover:text-white/70 transition-colors">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    </a>
                  )}
                  {/* Share / View */}
                  {viewUrl && (
                    <button type="button" title="Kopiuj link"
                      onClick={() => { void navigator.clipboard.writeText(viewUrl); }}
                      className="text-white/30 hover:text-white/70 transition-colors">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                      </svg>
                    </button>
                  )}
                  {/* Delete */}
                  <button type="button" title="Usuń" onClick={() => onDelete(f.id)}
                    className="text-white/30 hover:text-red-400 transition-colors">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Google Drive upload (chunked 5 MB, mirrors portal logic) ─────────────
async function uploadChunkedAdmin(
  uploadUri: string,
  file: File,
  mimeType: string,
  onProgress: (pct: number) => void,
): Promise<string> {
  const CHUNK = 5 * 1024 * 1024;
  const total = file.size;
  let offset = 0;

  const sendChunk = (start: number, end: number, isLast: boolean): Promise<string | null> =>
    new Promise((resolve, reject) => {
      const chunk = file.slice(start, end);
      const rangeHeader = isLast
        ? `bytes ${start}-${end - 1}/${total}`
        : `bytes ${start}-${end - 1}/*`;

      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUri);
      xhr.timeout = 5 * 60 * 1000;
      xhr.setRequestHeader("Content-Type", mimeType);
      xhr.setRequestHeader("Content-Range", rangeHeader);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.min(95, Math.round(((start + e.loaded) / total) * 95)));
        }
      };
      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try { onProgress(100); resolve((JSON.parse(xhr.responseText) as { id?: string }).id ?? ""); }
          catch { reject(new Error("Błąd odpowiedzi serwera")); }
        } else if (xhr.status === 308) {
          resolve(null);
        } else {
          reject(new Error(`Błąd ${xhr.status}: ${xhr.statusText || "nieznany"}`));
        }
      };
      xhr.ontimeout = () => reject(new Error("Timeout — za wolne połączenie"));
      xhr.onerror = () => reject(new Error("Błąd sieci"));
      xhr.send(chunk);
    });

  while (offset < total) {
    const end = Math.min(offset + CHUNK, total);
    const isLast = end === total;

    let fileId: string | null;
    try {
      fileId = await sendChunk(offset, end, isLast);
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
      fileId = await sendChunk(offset, end, isLast);
    }

    if (fileId !== null) return fileId;
    offset = end;
  }
  throw new Error("Upload zakończony bez ID pliku");
}

async function uploadFileToDriveAdmin(
  file: File,
  crm_client_id: string,
  onProgress: (pct: number) => void
): Promise<{ gdrive_file_id: string; gdrive_folder_id: string }> {
  let mimeType = file.type || "";
  if (!mimeType) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const map: Record<string, string> = {
      mov: "video/quicktime", mp4: "video/mp4", m4v: "video/x-m4v",
      webm: "video/webm", jpg: "image/jpeg", jpeg: "image/jpeg",
      png: "image/png", webp: "image/webp", heic: "image/heic",
      heif: "image/heif", pdf: "application/pdf",
    };
    mimeType = map[ext] ?? "application/octet-stream";
  }
  const initRes = await fetch("/api/portal/gdrive-init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_name: file.name, mime_type: mimeType, size_bytes: file.size, crm_client_id }),
  });
  if (!initRes.ok) { const e = await initRes.json(); throw new Error(e.error ?? "Błąd init"); }
  const { uploadUri, folderId } = await initRes.json() as { uploadUri: string; folderId: string };

  const fileId = await uploadChunkedAdmin(uploadUri, file, mimeType, onProgress);
  return { gdrive_file_id: fileId, gdrive_folder_id: folderId };
}

// ── Dropzone ─────────────────────────────────────────────────────────────

function DropzoneUpload({
  crm_client_id,
  onUploaded,
}: {
  crm_client_id: string;
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    const msgs: string[] = [];
    for (const file of Array.from(fileList)) {
      try {
        const { gdrive_file_id, gdrive_folder_id } = await uploadFileToDriveAdmin(
          file, crm_client_id,
          (pct) => setProgress([`⬆ ${file.name} — ${pct}%`])
        );
        const res = await fetch("/api/portal/gdrive-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gdrive_file_id, gdrive_folder_id,
            file_name: file.name,
            mime_type: file.type || "application/octet-stream",
            size_bytes: file.size,
            crm_client_id,
          }),
        });
        msgs.push(res.ok ? `✓ ${file.name}` : `✕ ${file.name}: błąd rejestracji`);
      } catch (err) {
        msgs.push(`✕ ${file.name}: ${err instanceof Error ? err.message : "błąd"}`);
      }
    }
    setProgress(msgs);
    setUploading(false);
    onUploaded();
    setTimeout(() => setProgress([]), 5000);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 transition-colors ${
          dragging
            ? "border-white/40 bg-white/8"
            : "border-white/15 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
        }`}
      >
        {uploading ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
            <span className="text-sm text-white/60">Wgrywam…</span>
          </div>
        ) : (
          <>
            <span className="mb-2 text-3xl">☁</span>
            <p className="text-sm text-white/60">
              Przeciągnij pliki tutaj lub <span className="text-white/90 underline">kliknij</span>
            </p>
            <p className="mt-1 text-xs text-white/30">Zdjęcia, wideo, PDF · bez limitu rozmiaru</p>
          </>
        )}
      </div>

      {progress.length > 0 && (
        <div className="mt-2 space-y-1">
          {progress.map((msg, i) => (
            <p key={i} className={`text-xs ${msg.startsWith("✓") ? "text-emerald-300" : "text-red-300"}`}>
              {msg}
            </p>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,.mov,.mp4,.heic,.heif,application/pdf"
        className="hidden"
        onChange={(e) => {
          void uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ── NotesPanel ────────────────────────────────────────────────────────────

function NotesPanel({
  notes,
  crm_client_id,
  onChanged,
}: {
  notes: PortalNote[];
  crm_client_id: string;
  onChanged: () => void;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const addNote = async () => {
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

  const deleteNote = async (id: string) => {
    await fetch(`/api/portal/notes?id=${id}`, { method: "DELETE" });
    onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Dodaj notatkę dla klienta…"
          rows={2}
          className="glass-field flex-1 rounded-2xl px-4 py-3 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void addNote();
          }}
        />
        <Button type="button" onClick={addNote} disabled={saving || !text.trim()} className="self-end">
          {saving ? "…" : "Dodaj"}
        </Button>
      </div>

      <div className="space-y-2">
        {notes.length === 0 ? (
          <p className="label-mono opacity-30">Brak notatek</p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="group relative rounded-2xl bg-white/[0.04] px-4 py-3">
              <p className="whitespace-pre-wrap text-sm text-white/80">{n.content}</p>
              <p className="mt-1.5 text-[0.6rem] text-white/30">
                {n.author === "client" ? n.author_name ?? "Klient" : "Cosgral"} · {fmtDate(n.created_at)}
              </p>
              <button
                type="button"
                onClick={() => void deleteNote(n.id)}
                className="absolute right-3 top-3 hidden text-white/30 hover:text-red-300 group-hover:block"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── ChatPanel ─────────────────────────────────────────────────────────────

function ChatPanel({
  messages,
  crm_client_id,
  onNewMessage,
}: {
  messages: PortalMessage[];
  crm_client_id: string;
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

  const deleteMessage = async (id: string) => {
    await fetch(`/api/portal/messages/${id}`, { method: "DELETE" });
    onNewMessage();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Messages */}
      <div className="h-72 overflow-y-auto rounded-2xl bg-white/[0.03] p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="label-mono opacity-30 text-center mt-8">Brak wiadomości</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`group flex items-start gap-2 ${m.sender === "admin" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.sender === "admin"
                    ? "bg-white/12 text-white"
                    : "bg-white/[0.06] text-white/80"
                }`}
              >
                <p className="mb-0.5 text-[0.6rem] font-semibold uppercase tracking-widest opacity-50">
                  {m.sender === "admin" ? "Cosgral" : m.sender_name}
                </p>
                <p className="leading-relaxed">{m.content}</p>
              </div>
              <button
                type="button"
                onClick={() => void deleteMessage(m.id)}
                className="hidden group-hover:flex shrink-0 h-6 w-6 items-center justify-center rounded-full text-white/20 hover:bg-red-500/15 hover:text-red-400 transition-colors text-xs mt-1"
              >
                ✕
              </button>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Napisz wiadomość…"
          className="glass-field flex-1 rounded-2xl px-4 py-2.5 text-sm"
          onKeyDown={(e) => e.key === "Enter" && void send()}
        />
        <Button type="button" onClick={send} disabled={sending || !text.trim()}>
          {sending ? "…" : "Wyślij"}
        </Button>
      </div>
    </div>
  );
}

// ── PortalAuthSection — shows client portal auth status, allows revoking ──

function PortalAuthSection({ crm_client_id }: { crm_client_id: string }) {
  const [auth, setAuth] = useState<{ id: string; username: string; created_at: string; session_expires_at?: string } | null | undefined>(undefined);
  const [revoking, setRevoking] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/portal/auth-status?crm_client_id=${crm_client_id}`);
    const d = await res.json();
    setAuth(d.auth);
  };

  useEffect(() => { void load(); }, [crm_client_id]);

  const revoke = async () => {
    if (!confirm("Cofnąć dostęp portalu? Klient będzie musiał utworzyć nowe konto.")) return;
    setRevoking(true);
    await fetch(`/api/portal/auth-status?crm_client_id=${crm_client_id}`, { method: "DELETE" });
    setRevoking(false);
    void load();
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-3">
      <p className="label-mono">Dostęp portalu klienta</p>
      {auth === undefined ? (
        <p className="text-sm text-white/30">Sprawdzam…</p>
      ) : auth === null ? (
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-white/20" />
          <p className="text-sm text-white/50">Klient nie utworzył jeszcze konta</p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <div>
              <p className="text-sm text-white font-medium">{auth.username}</p>
              <p className="text-[0.6rem] text-white/30">Konto utworzone {new Date(auth.created_at).toLocaleDateString("pl-PL")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={revoke}
            disabled={revoking}
            className="rounded-xl border border-red-500/25 px-3 py-1.5 text-xs text-red-400/70 hover:bg-red-500/10 hover:text-red-300 transition-colors disabled:opacity-40"
          >
            {revoking ? "Cofam…" : "Cofnij dostęp"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── AccessRequests ────────────────────────────────────────────────────────

function AccessRequests({
  requests,
  onChanged,
}: {
  requests: PortalAccessRequest[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (id: string, action: "approve" | "reject") => {
    setBusy(id);
    await fetch(`/api/portal/approve/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    onChanged();
  };

  const del = async (id: string) => {
    setBusy(id);
    await fetch(`/api/portal/access-requests/${id}`, { method: "DELETE" });
    setBusy(null);
    onChanged();
  };

  if (requests.length === 0) {
    return <p className="label-mono opacity-30">Brak próśb o dostęp</p>;
  }

  return (
    <div className="space-y-2">
      {requests.map((r) => (
        <div
          key={r.id}
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
            r.status === "pending"
              ? "border-white/20 bg-white/[0.04]"
              : r.status === "approved"
              ? "border-emerald-500/25 bg-emerald-500/8"
              : "border-white/10 bg-white/[0.03]"
          }`}
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-white truncate">{r.requester_name}</p>
            {r.requester_email && (
              <p className="text-xs text-white/45 truncate">{r.requester_email}</p>
            )}
            <p className="text-[0.6rem] text-white/30 mt-0.5">{fmtDate(r.created_at)}</p>
          </div>

          <span className={`text-[0.6rem] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
            r.status === "pending"
              ? "border-white/25 text-white/60"
              : r.status === "approved"
              ? "border-emerald-400/40 text-emerald-300"
              : "border-white/20 text-white/40"
          }`}>
            {r.status === "pending" ? "Oczekuje" : r.status === "approved" ? "Zatwierdzono" : "Odrzucono"}
          </span>

          {r.status === "pending" && (
            <div className="flex gap-1.5 shrink-0">
              <Button
                type="button"
                onClick={() => act(r.id, "approve")}
                disabled={busy === r.id}
                className="text-xs"
              >
                ✓ Daj dostęp
              </Button>
              <Button
                variant="ghost"
                type="button"
                onClick={() => act(r.id, "reject")}
                disabled={busy === r.id}
                className="text-xs text-white/40 hover:text-white/70"
              >
                ✕
              </Button>
            </div>
          )}

          {/* Delete any status */}
          <button
            type="button"
            onClick={() => void del(r.id)}
            disabled={busy === r.id}
            title="Usuń wpis"
            className="shrink-0 rounded-full p-1.5 text-white/20 hover:bg-red-500/15 hover:text-red-400 transition-colors"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

type TabId = "pliki" | "notatki" | "czat" | "dostep";

export default function MaterialyDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<{ id: string; company_name: string; portal_slug: string | null } | null>(null);
  const [files, setFiles] = useState<PortalFile[]>([]);
  const [notes, setNotes] = useState<PortalNote[]>([]);
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [requests, setRequests] = useState<PortalAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabId>("pliki");
  const [shareOpen, setShareOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/clients/${clientId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Błąd");
        return;
      }

      setClient(data.client);
      setFiles(data.files ?? []);
      setNotes(data.notes ?? []);
      setMessages(data.messages ?? []);
      setRequests(data.access_requests ?? []);
      setError("");
    } catch {
      setError("Błąd sieci");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  // Poll for new chat messages every 8s
  useEffect(() => {
    if (tab !== "czat") return;
    const id = setInterval(() => void load(), 8000);
    return () => clearInterval(id);
  }, [tab, load]);

  const deleteFile = async (id: string) => {
    if (!confirm("Usunąć plik?")) return;
    await fetch(`/api/portal/files/${id}`, { method: "DELETE" });
    void load();
  };

  const TABS: { id: TabId; label: string; badge?: number }[] = [
    { id: "pliki",   label: "Pliki",         badge: files.length },
    { id: "notatki", label: "Notatki",        badge: notes.length },
    { id: "czat",    label: "Czat",           badge: messages.length },
    { id: "dostep",  label: "Dostęp",         badge: requests.filter(r => r.status === "pending").length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
        <span className="label-mono ml-3">Ładowanie…</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2">
        <Link href="/admin/materialy" className="label-mono text-white/40 hover:text-white/70">
          ← Materiały
        </Link>
      </div>
      <PageHeader
        eyebrow="Cosgral"
        title={client?.company_name ?? "Katalog klienta"}
        description={client?.portal_slug ? `Portal: /portal/${client.portal_slug}` : "Brak linku portalu"}
        actions={
          <Button type="button" onClick={() => setShareOpen(true)}>
            <svg
              className="mr-1.5 inline-block h-3.5 w-3.5"
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
          </Button>
        }
      />

      {shareOpen && client && (
        <CatalogShareModal
          crmClientId={clientId}
          companyName={client.company_name}
          portalSlug={client.portal_slug}
          onClose={() => setShareOpen(false)}
          onSlugGenerated={(slug) =>
            setClient((prev) => (prev ? { ...prev, portal_slug: slug } : prev))
          }
        />
      )}

      {error && (
        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-white/8 pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-white/60 text-white"
                : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold ${
                t.id === "dostep" && t.badge > 0 ? "bg-amber-400/30 text-amber-300" : "bg-white/10 text-white/50"
              }`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="space-y-6">
        {tab === "pliki" && (
          <>
            <DropzoneUpload crm_client_id={clientId} onUploaded={load} />
            <FileGrid files={files} onDelete={deleteFile} />
          </>
        )}

        {tab === "notatki" && (
          <NotesPanel notes={notes} crm_client_id={clientId} onChanged={load} />
        )}

        {tab === "czat" && (
          <ChatPanel messages={messages} crm_client_id={clientId} onNewMessage={load} />
        )}

        {tab === "dostep" && (
          <div className="space-y-6">
            {/* Portal Auth Status */}
            <PortalAuthSection crm_client_id={clientId} />
            {/* Legacy access requests */}
            {requests.length > 0 && (
              <div>
                <p className="label-mono mb-3 opacity-50">Poprzednie prośby o dostęp (legacy)</p>
                <AccessRequests requests={requests} onChanged={load} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
