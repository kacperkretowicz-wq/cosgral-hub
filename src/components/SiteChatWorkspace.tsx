"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SwipeThreadRow } from "@/components/SwipeThreadRow";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Thread = {
  id: string;
  visitor_key: string;
  page_url: string;
  status: string;
  created_at: string;
  last_message_at: string;
  deleted_at?: string;
};

type Message = {
  id: string;
  thread_id: string;
  role: "visitor" | "agent";
  body: string;
  created_at: string;
};

type Props = {
  initialThread?: string;
  requirePin?: boolean;
};

type ConfirmState =
  | null
  | { kind: "trash"; threadId: string }
  | { kind: "forever"; threadId: string }
  | { kind: "empty" };

export function SiteChatWorkspace({
  initialThread = "",
  requirePin = false,
}: Props) {
  const [authed, setAuthed] = useState(!requirePin);
  const [pin, setPin] = useState("");
  const [view, setView] = useState<"inbox" | "trash">("inbox");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [trash, setTrash] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState(initialThread);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const list = view === "inbox" ? threads : trash;
  const active = useMemo(
    () => list.find((t) => t.id === activeId) || null,
    [list, activeId],
  );

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/site-chat/agent-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Zły PIN");
      return;
    }
    setAuthed(true);
  };

  const loadInbox = useCallback(async () => {
    const res = await fetch("/api/site-chat/admin", { cache: "no-store" });
    if (res.status === 401) {
      if (requirePin) setAuthed(false);
      else setError("Zaloguj się jako admin");
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Błąd ładowania");
      return;
    }
    setError("");
    setAuthed(true);
    setThreads(Array.isArray(data) ? data : []);
  }, [requirePin]);

  const loadTrash = useCallback(async () => {
    const res = await fetch("/api/site-chat/admin?trash=1", {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = await res.json();
    setTrash(Array.isArray(data) ? data : []);
  }, []);

  const loadMessages = useCallback(async (threadId: string) => {
    if (!threadId) {
      setMessages([]);
      return;
    }
    const res = await fetch(
      `/api/site-chat/admin?thread=${encodeURIComponent(threadId)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return;
    const data = await res.json();
    setMessages(Array.isArray(data.messages) ? data.messages : []);
  }, []);

  useEffect(() => {
    if (!authed && requirePin) return;
    loadInbox();
    loadTrash();
  }, [authed, requirePin, loadInbox, loadTrash]);

  useEffect(() => {
    if (!authed) return;
    const id = window.setInterval(() => {
      loadInbox();
      if (view === "trash") loadTrash();
    }, 2500);
    return () => window.clearInterval(id);
  }, [authed, view, loadInbox, loadTrash]);

  useEffect(() => {
    if (!activeId && list[0]) setActiveId(list[0].id);
    if (activeId && !list.some((t) => t.id === activeId)) {
      setActiveId(list[0]?.id || "");
    }
  }, [list, activeId]);

  useEffect(() => {
    if (!authed || !activeId) return;
    loadMessages(activeId);
    const id = window.setInterval(() => loadMessages(activeId), 1500);
    return () => window.clearInterval(id);
  }, [authed, activeId, loadMessages]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !draft.trim() || view === "trash") return;
    setSending(true);
    const res = await fetch("/api/site-chat/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thread_id: activeId, body: draft }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(
        typeof data.error === "string" ? data.error : "Nie udało się wysłać",
      );
      return;
    }
    setDraft("");
    await loadMessages(activeId);
    await loadInbox();
  };

  const moveToTrash = async (threadId: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/site-chat/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trash", thread_id: threadId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          typeof data.error === "string"
            ? data.error
            : "Nie udało się przenieść do kosza",
        );
        return;
      }
      if (activeId === threadId) {
        setActiveId("");
        setMessages([]);
      }
      await loadInbox();
      await loadTrash();
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const deleteForever = async (threadId: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/site-chat/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_forever",
          thread_id: threadId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          typeof data.error === "string" ? data.error : "Nie udało się usunąć",
        );
        return;
      }
      if (activeId === threadId) {
        setActiveId("");
        setMessages([]);
      }
      await loadTrash();
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const emptyTrashBin = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/site-chat/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "empty_trash" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          typeof data.error === "string"
            ? data.error
            : "Nie udało się opróżnić",
        );
        return;
      }
      setActiveId("");
      setMessages([]);
      await loadTrash();
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const requestDelete = (threadId: string) => {
    if (view === "trash") {
      setConfirm({ kind: "forever", threadId });
      return;
    }
    // Gmail swipe / list: straight to trash
    void moveToTrash(threadId);
  };

  const shortKey = (key: string) =>
    key.length > 10 ? `${key.slice(0, 8)}…` : key;

  if (requirePin && !authed) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-4 p-6 text-white">
        <h1 className="text-2xl font-semibold">Czat Cosgral</h1>
        <p className="text-sm text-white/50">
          Wpisz PIN agenta, żeby odpisywać na wiadomości ze strony.
        </p>
        <form onSubmit={unlock} className="space-y-3">
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-white outline-none focus:border-white/40"
            autoFocus
          />
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <Button type="submit" className="w-full">
            Wejdź
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-mono mb-1">Czat ze strony</p>
          <p className="text-sm text-white/50">
            Mobile: przesuń w lewo → Usuń (jak Gmail). Desktop: Usuń na hover.
            Historia 24h.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setView((v) => (v === "inbox" ? "trash" : "inbox"));
            setActiveId("");
            setMessages([]);
            if (view === "inbox") void loadTrash();
          }}
        >
          {view === "trash"
            ? "Skrzynka"
            : `Kosz${trash.length ? ` (${trash.length})` : ""}`}
        </Button>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[300px_1fr]">
        <section className="flex max-h-[70vh] flex-col rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
            <span className="label-mono">
              {view === "inbox" ? "Rozmowy" : "Kosz"}
            </span>
            {view === "trash" ? (
              <Button
                type="button"
                variant="ghost"
                disabled={trash.length === 0}
                className="px-3 py-1.5 text-red-400/80 hover:bg-red-500/10 hover:text-red-300"
                onClick={() => setConfirm({ kind: "empty" })}
              >
                Opróżnij kosz
              </Button>
            ) : null}
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {list.length === 0 ? (
              <p className="p-3 text-sm text-white/40">
                {view === "inbox"
                  ? "Brak aktywnych rozmów."
                  : "Kosz jest pusty."}
              </p>
            ) : (
              list.map((t) => (
                <SwipeThreadRow
                  key={t.id}
                  active={t.id === activeId}
                  title={shortKey(t.visitor_key)}
                  subtitle={t.page_url || "—"}
                  meta={
                    view === "trash" && t.deleted_at
                      ? `Usunięto ${new Date(t.deleted_at).toLocaleString("pl-PL")}`
                      : new Date(t.last_message_at).toLocaleString("pl-PL")
                  }
                  trashMode={view === "trash"}
                  swipeCommits={view === "inbox"}
                  onSelect={() => setActiveId(t.id)}
                  onTrash={() => requestDelete(t.id)}
                />
              ))
            )}
          </div>
        </section>

        <section className="flex max-h-[70vh] flex-col rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <p className="min-w-0 truncate text-sm text-white/60">
              {active
                ? `${view === "trash" ? "Kosz · " : ""}Gość ${shortKey(active.visitor_key)}`
                : "Wybierz wątek"}
            </p>
            {active ? (
              <Button
                type="button"
                variant="ghost"
                className="shrink-0 px-3 py-2 text-red-400/80 hover:bg-red-500/10 hover:text-red-300"
                disabled={busy}
                onClick={() => {
                  if (view === "trash") {
                    setConfirm({ kind: "forever", threadId: active.id });
                  } else {
                    setConfirm({ kind: "trash", threadId: active.id });
                  }
                }}
              >
                Usuń
              </Button>
            ) : null}
          </div>
          <div
            ref={listRef}
            className="flex-1 space-y-2 overflow-y-auto px-4 py-3"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "agent"
                    ? "ml-auto bg-white/15 text-white"
                    : "bg-white/10 text-white"
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
              </div>
            ))}
          </div>
          {view === "inbox" ? (
            <form
              onSubmit={send}
              className="flex gap-2 border-t border-white/10 p-3"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Odpisz gościowi…"
                disabled={!activeId || sending}
                className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white outline-none focus:border-white/35"
              />
              <Button
                type="submit"
                disabled={!activeId || sending || !draft.trim()}
              >
                Wyślij
              </Button>
            </form>
          ) : (
            <div className="border-t border-white/10 px-4 py-3 text-xs text-white/40">
              Podgląd z kosza — odpisanie wyłączone.
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirm?.kind === "trash"}
        title="Przenieść do kosza?"
        body="Rozmowa zniknie ze skrzynki. Możesz ją usunąć na zawsze z kosza."
        confirmLabel="Do kosza"
        danger
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.kind === "trash") void moveToTrash(confirm.threadId);
        }}
      />
      <ConfirmDialog
        open={confirm?.kind === "forever"}
        title="Usunąć na zawsze?"
        body="Tej rozmowy nie da się odzyskać."
        confirmLabel="Usuń"
        danger
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.kind === "forever") void deleteForever(confirm.threadId);
        }}
      />
      <ConfirmDialog
        open={confirm?.kind === "empty"}
        title="Opróżnić kosz?"
        body="Wszystkie rozmowy w koszu znikną na zawsze."
        confirmLabel="Opróżnij"
        danger
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void emptyTrashBin()}
      />
    </div>
  );
}
