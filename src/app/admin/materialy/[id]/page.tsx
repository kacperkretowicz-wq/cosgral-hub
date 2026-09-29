"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/CrmUi";
import { Button } from "@/components/ui/Button";
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
  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-dashed border-white/15 py-12">
        <p className="label-mono opacity-40">Brak plików — przeciągnij lub kliknij Wgraj</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {files.map((f) => (
        <div key={f.id} className="group relative overflow-hidden rounded-2xl bg-white/[0.04]">
          {/* Preview */}
          {isImage(f.mime_type) && f.public_url ? (
            <a href={f.public_url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.public_url}
                alt={f.file_name}
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
            </a>
          ) : isVideo(f.mime_type) && f.public_url ? (
            <a href={f.public_url} target="_blank" rel="noopener noreferrer"
              className="flex aspect-square w-full items-center justify-center bg-white/[0.06]">
              <span className="text-3xl">▶</span>
            </a>
          ) : (
            <a href={f.public_url ?? "#"} target="_blank" rel="noopener noreferrer"
              className="flex aspect-square w-full items-center justify-center bg-white/[0.06]">
              <span className="text-3xl">
                {f.mime_type === "application/pdf" ? "📄" : "📁"}
              </span>
            </a>
          )}

          {/* Info bar */}
          <div className="p-2">
            <p className="truncate text-[0.65rem] text-white/70">{f.file_name}</p>
            <p className="text-[0.6rem] text-white/35">
              {fmtSize(f.size_bytes)} · {f.uploaded_by === "client" ? f.uploader_name ?? "klient" : "admin"}
            </p>
          </div>

          {/* Delete button */}
          <button
            type="button"
            onClick={() => onDelete(f.id)}
            className="absolute right-1.5 top-1.5 hidden rounded-full bg-black/70 p-1 text-xs text-white/70 hover:text-red-300 group-hover:flex"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
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
      const fd = new FormData();
      fd.append("file", file);
      fd.append("crm_client_id", crm_client_id);
      const res = await fetch("/api/portal/upload", { method: "POST", body: fd });
      const data = await res.json();
      msgs.push(res.ok ? `✓ ${file.name}` : `✕ ${file.name}: ${data.error ?? "błąd"}`);
    }
    setProgress(msgs);
    setUploading(false);
    onUploaded();
    setTimeout(() => setProgress([]), 4000);
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
            <p className="mt-1 text-xs text-white/30">JPG, PNG, WEBP, MP4, PDF · max 100 MB</p>
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
        accept="image/*,video/mp4,video/quicktime,video/webm,application/pdf"
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
              className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}
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
              ? "border-amber-400/25 bg-amber-400/8"
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
              ? "border-amber-400/40 text-amber-300"
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
                className="text-xs text-red-300/70 hover:text-red-300"
              >
                ✕
              </Button>
            </div>
          )}
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
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!client?.portal_slug && !loading) return;
    try {
      // First get slug from admin endpoint
      const clientsRes = await fetch("/api/portal/clients", { cache: "no-store" });
      const clientsData = await clientsRes.json();
      const found = (clientsData.clients ?? []).find((c: { id: string }) => c.id === clientId);
      if (!found) { setError("Klient nie znaleziony"); return; }

      setClient(found);
      if (!found.portal_slug) { setLoading(false); return; }

      const res = await fetch(`/api/portal/${found.portal_slug}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Błąd"); return; }

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

  const copyLink = async () => {
    if (!client?.portal_slug) return;
    const url = `${window.location.origin}/portal/${client.portal_slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <div className="flex gap-2">
            {client?.portal_slug && (
              <Button variant="secondary" type="button" onClick={copyLink}>
                {copied ? "✓ Skopiowano" : "Kopiuj link klienta"}
              </Button>
            )}
            {client?.portal_slug && (
              <a
                href={`/portal/${client.portal_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-2xl border border-white/20 bg-white/8 px-4 py-2 text-sm text-white/80 hover:bg-white/12"
              >
                Podgląd portalu ↗
              </a>
            )}
          </div>
        }
      />

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
          <AccessRequests requests={requests} onChanged={load} />
        )}
      </div>
    </div>
  );
}
