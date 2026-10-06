"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/CrmUi";
import { teamLabel } from "@/lib/team";
import type { TeamMessage } from "@/lib/types";

export default function TeamChatPage() {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/team-chat", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Błąd");
        return;
      }
      // Backward-compatible: array (legacy) or { messages, me }
      if (Array.isArray(data)) {
        setMessages(data);
      } else {
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        if (typeof data.me === "string") setMe(data.me);
      }
      setError("");
    } catch {
      setError("Błąd sieci");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 1500);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!stickToBottom.current) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    stickToBottom.current = true;
    const res = await fetch("/api/team-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: body.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Błąd wysyłki");
      return;
    }
    setBody("");
    await load();
  };

  const startEdit = (m: TeamMessage) => {
    stickToBottom.current = false;
    setEditingId(m.id);
    setEditDraft(m.body);
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
  };

  const saveEdit = async (id: string) => {
    if (!editDraft.trim()) return;
    setActionBusy(id);
    setError("");
    try {
      const res = await fetch(`/api/team-chat/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editDraft.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Błąd edycji");
        return;
      }
      setEditingId(null);
      setEditDraft("");
      await load();
    } catch {
      setError("Błąd sieci");
    } finally {
      setActionBusy(null);
    }
  };

  const removeMessage = async (id: string) => {
    if (!confirm("Usunąć tę wiadomość?")) return;
    setActionBusy(id);
    setError("");
    try {
      const res = await fetch(`/api/team-chat/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Błąd usuwania");
        return;
      }
      if (editingId === id) cancelEdit();
      await load();
    } catch {
      setError("Błąd sieci");
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col md:h-[calc(100dvh-4rem)]">
      <PageHeader
        eyebrow="Team"
        title="Czat wewnętrzny"
        description="Jakub · Kacper — poll 1.5s, alert Telegram."
      />

      {error ? (
        <div className="mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="surface min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {!messages.length ? (
          <p className="py-12 text-center text-sm text-white/40">
            Napisz pierwszą wiadomość do zespołu.
          </p>
        ) : (
          messages.map((m) => {
            const mine = Boolean(me && m.author_id === me);
            const editing = editingId === m.id;
            const busyRow = actionBusy === m.id;

            return (
              <div key={m.id} className={`group max-w-[85%] ${mine ? "ml-auto" : ""}`}>
                <div className="mb-1 flex items-center gap-2">
                  <p className="label-mono text-[0.58rem] text-white/35">
                    {teamLabel(m.author_id)} ·{" "}
                    {new Date(m.created_at).toLocaleTimeString("pl-PL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {m.updated_at ? " · edytowano" : ""}
                  </p>
                  {!editing ? (
                    <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      {mine ? (
                        <button
                          type="button"
                          disabled={busyRow}
                          onClick={() => startEdit(m)}
                          className="text-[0.58rem] uppercase tracking-[0.12em] text-white/40 hover:text-white/80 disabled:opacity-40"
                        >
                          Edytuj
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busyRow}
                        onClick={() => void removeMessage(m.id)}
                        className="text-[0.58rem] uppercase tracking-[0.12em] text-red-300/70 hover:text-red-200 disabled:opacity-40"
                      >
                        Usuń
                      </button>
                    </div>
                  ) : null}
                </div>

                {editing ? (
                  <div className="space-y-2 rounded-2xl border border-white/20 bg-white/[0.08] p-3">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-white/35"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={busyRow}
                        className="rounded-full px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.12em] text-white/50 hover:text-white"
                      >
                        Anuluj
                      </button>
                      <Button
                        type="button"
                        disabled={busyRow || !editDraft.trim()}
                        onClick={() => void saveEdit(m.id)}
                        className="px-4 py-1.5 text-xs"
                      >
                        {busyRow ? "…" : "Zapisz"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`rounded-2xl border px-4 py-2.5 text-sm leading-relaxed shadow-[0_1px_0_rgba(255,255,255,0.08)_inset] ${
                      mine
                        ? "border-white/18 bg-white/[0.12] text-white"
                        : "border-white/12 bg-white/[0.07] text-white/90"
                    }`}
                  >
                    {m.body}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="mt-4 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Wiadomość…"
          className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/35"
        />
        <Button type="submit" disabled={busy || !body.trim()}>
          Wyślij
        </Button>
      </form>
    </div>
  );
}
