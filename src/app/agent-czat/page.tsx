"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Thread = {
  id: string;
  visitor_key: string;
  page_url: string;
  status: string;
  created_at: string;
  last_message_at: string;
};

type Message = {
  id: string;
  thread_id: string;
  role: "visitor" | "agent";
  body: string;
  created_at: string;
};

function AgentCzatInner() {
  const searchParams = useSearchParams();
  const initialThread = searchParams.get("thread") || "";

  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState(initialThread);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const active = useMemo(
    () => threads.find((t) => t.id === activeId) || null,
    [threads, activeId],
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

  const loadThreads = useCallback(async () => {
    const res = await fetch("/api/site-chat/admin", { cache: "no-store" });
    if (res.status === 401) {
      setAuthed(false);
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
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!authed) return;
    const id = window.setInterval(loadThreads, 2500);
    return () => window.clearInterval(id);
  }, [authed, loadThreads]);

  useEffect(() => {
    if (!activeId && threads[0]) setActiveId(threads[0].id);
  }, [threads, activeId]);

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
    if (!activeId || !draft.trim()) return;
    setSending(true);
    const res = await fetch("/api/site-chat/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thread_id: activeId, body: draft }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Nie udało się wysłać");
      return;
    }
    setDraft("");
    await loadMessages(activeId);
    await loadThreads();
  };

  const shortKey = (key: string) => (key.length > 10 ? `${key.slice(0, 8)}…` : key);

  if (!authed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6 text-white">
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
          <button
            type="submit"
            className="w-full rounded-xl bg-lime-300 px-4 py-3 font-semibold text-black"
          >
            Wejdź
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 text-white md:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Czat ze strony</h1>
          <p className="mt-1 text-sm text-white/50">Historia znika po 24h.</p>
        </div>
        <a href="https://cosgral.pl/" className="text-sm text-white/40 underline">
          cosgral.pl
        </a>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <section className="max-h-[70vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-2">
          {threads.length === 0 ? (
            <p className="p-3 text-sm text-white/40">Brak aktywnych rozmów.</p>
          ) : (
            <ul className="space-y-1">
              {threads.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                      t.id === activeId
                        ? "bg-white/15 text-white"
                        : "text-white/70 hover:bg-white/5"
                    }`}
                  >
                    <div className="font-medium">{shortKey(t.visitor_key)}</div>
                    <div className="truncate text-xs text-white/40">
                      {t.page_url || "—"}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex max-h-[70vh] flex-col rounded-2xl border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-4 py-3 text-sm text-white/60">
            {active ? `Gość ${shortKey(active.visitor_key)}` : "Wybierz wątek"}
          </div>
          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "agent"
                    ? "ml-auto bg-lime-300/20 text-lime-50"
                    : "bg-white/10 text-white"
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
              </div>
            ))}
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-white/10 p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Odpisz gościowi…"
              disabled={!activeId || sending}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
            />
            <button
              type="submit"
              disabled={!activeId || sending || !draft.trim()}
              className="rounded-xl bg-lime-300 px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
            >
              Wyślij
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function AgentCzatPage() {
  return (
    <div className="min-h-screen bg-black">
      <Suspense fallback={<p className="p-6 text-white/50">Ładowanie…</p>}>
        <AgentCzatInner />
      </Suspense>
    </div>
  );
}
