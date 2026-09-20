"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";

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

function AdminCzatInner() {
  const searchParams = useSearchParams();
  const initialThread = searchParams.get("thread") || "";

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

  const loadThreads = useCallback(async () => {
    const res = await fetch("/api/site-chat/admin", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      setError(
        typeof data.error === "string"
          ? data.error
          : "Błąd ładowania czatu — uruchom migrację 010_site_chat.sql na /admin/setup",
      );
      return;
    }
    setError("");
    setThreads(Array.isArray(data) ? data : []);
  }, []);

  const loadMessages = useCallback(async (threadId: string) => {
    if (!threadId) {
      setMessages([]);
      return;
    }
    const res = await fetch(`/api/site-chat/admin?thread=${encodeURIComponent(threadId)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) return;
    setMessages(Array.isArray(data.messages) ? data.messages : []);
  }, []);

  useEffect(() => {
    loadThreads();
    const id = window.setInterval(loadThreads, 2500);
    return () => window.clearInterval(id);
  }, [loadThreads]);

  useEffect(() => {
    if (!activeId && threads[0]) setActiveId(threads[0].id);
  }, [threads, activeId]);

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
    const id = window.setInterval(() => loadMessages(activeId), 1500);
    return () => window.clearInterval(id);
  }, [activeId, loadMessages]);

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

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Czat ze strony</h1>
        <p className="mt-1 text-sm text-white/50">
          Wątki z cosgral.pl — historia automatycznie znika po 24h.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <GlassCard className="!p-2 max-h-[70vh] overflow-y-auto">
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
                    <div className="text-[10px] text-white/30">
                      {new Date(t.last_message_at).toLocaleString("pl-PL")}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="!p-0 flex max-h-[70vh] flex-col">
          <div className="border-b border-white/10 px-4 py-3 text-sm text-white/60">
            {active ? (
              <>
                <span className="text-white">Gość {shortKey(active.visitor_key)}</span>
                {active.page_url ? (
                  <span className="ml-2 truncate opacity-60">{active.page_url}</span>
                ) : null}
              </>
            ) : (
              "Wybierz wątek"
            )}
          </div>

          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "agent"
                    ? "ml-auto bg-emerald-500/20 text-emerald-50"
                    : "bg-white/10 text-white"
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                <div className="mt-1 text-[10px] opacity-40">
                  {new Date(m.created_at).toLocaleTimeString("pl-PL")}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={send} className="flex gap-2 border-t border-white/10 p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Odpisz gościowi…"
              disabled={!activeId || sending}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
            />
            <Button type="submit" disabled={!activeId || sending || !draft.trim()}>
              Wyślij
            </Button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}

export default function AdminCzatPage() {
  return (
    <Suspense fallback={<p className="p-6 text-white/50">Ładowanie czatu…</p>}>
      <AdminCzatInner />
    </Suspense>
  );
}
