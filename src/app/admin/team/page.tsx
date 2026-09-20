"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/CrmUi";
import { teamLabel } from "@/lib/team";
import type { TeamMessage } from "@/lib/types";

export default function TeamChatPage() {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/team-chat", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Błąd");
        return;
      }
      setMessages(Array.isArray(data) ? data : []);
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
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

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        {!messages.length ? (
          <p className="py-12 text-center text-sm text-white/40">
            Napisz pierwszą wiadomość do zespołu.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="max-w-[85%]">
              <p className="label-mono mb-1 text-[0.58rem] text-white/35">
                {teamLabel(m.author_id)} ·{" "}
                {new Date(m.created_at).toLocaleTimeString("pl-PL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm leading-relaxed text-white/90">
                {m.body}
              </div>
            </div>
          ))
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
