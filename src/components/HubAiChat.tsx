"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CosgralChatCube } from "@/components/CosgralChatCube";
import { Button } from "@/components/ui/Button";

type Msg = { role: "user" | "assistant"; content: string };

type HubAiChatProps = {
  /** W pasku mobilnym — mniejszy przycisk, panel pod headerem */
  compact?: boolean;
};

export function HubAiChat({ compact = false }: HubAiChatProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Cześć — Cosgral AI (Gemini). Mogę zarządzać kalendarzem, taskami, klientami i zleceniami. Np. „zapisz w kalendarzu deadline oddania strony na piątek z przypomnieniem dzień wcześniej”.",
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openBtnRef = useRef<HTMLButtonElement>(null);

  const openChat = useCallback(() => setOpen(true), []);
  const closeChat = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const el = openBtnRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      e.preventDefault();
      openChat();
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [openChat]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    inputRef.current?.focus();
  }, [open, messages, busy]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeChat();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeChat]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const nextHistory = [...messages, { role: "user" as const, content: text }];
    setMessages(nextHistory);
    setBusy(true);
    try {
      const res = await fetch("/api/hub-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: nextHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const data = (await res.json()) as {
        reply?: string;
        error?: string;
        provider?: string;
      };
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Błąd AI",
        );
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "OK." },
      ]);
      router.refresh();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err instanceof Error ? err.message : "Nie udało się wysłać.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        ref={openBtnRef}
        type="button"
        data-open={open ? "1" : "0"}
        aria-expanded={open}
        aria-label="Cosgral AI"
        className={`group relative z-[45] flex shrink-0 items-center justify-center overflow-visible rounded-2xl border border-white/15 bg-black/40 shadow-[0_12px_36px_rgba(0,0,0,0.45)] backdrop-blur-md transition duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-white/30 ${
          compact
            ? "h-11 w-11"
            : "h-14 w-14 sm:h-16 sm:w-16"
        }`}
      >
        <span
          className={`absolute ${compact ? "inset-[-16%]" : "inset-[-18%] sm:inset-[-14%]"}`}
        >
          <CosgralChatCube dimmed={open} />
        </span>
        <span className="pointer-events-none absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#5b8def] shadow-[0_0_10px_rgba(91,141,239,0.85)]" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            aria-label="Zamknij czat"
            onClick={closeChat}
          />
          <div
            className={`fixed z-[81] w-[min(100%-1.5rem,22rem)] origin-top-right animate-[sheetIn_0.35s_var(--ease)_both] ${
              compact
                ? "right-3 top-[max(3.5rem,calc(env(safe-area-inset-top)+3.25rem))]"
                : "right-3 top-[5.25rem] sm:right-5 sm:top-24 xl:right-8"
            }`}
          >
            <div className="hub-tile hub-tile-white flex max-h-[min(70vh,34rem)] flex-col overflow-hidden !rounded-[1.5rem]">
              <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                <div className="relative h-10 w-10 shrink-0 overflow-visible">
                  <CosgralChatCube dimmed />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">Cosgral AI</p>
                  <p className="text-[0.65rem] uppercase tracking-[0.16em] text-white/40">
                    Gemini · zarządzanie Hubem
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="rounded-full px-3 py-1.5 text-[0.65rem]"
                  onClick={closeChat}
                >
                  Zamknij
                </Button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                {messages.map((m, i) => (
                  <div
                    key={`${m.role}-${i}`}
                    className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "ml-auto bg-white/90 text-black"
                        : "bg-white/[0.07] text-white/85"
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
                {busy ? (
                  <p className="text-xs text-white/40">Gemini myśli…</p>
                ) : null}
                <div ref={bottomRef} />
              </div>

              <form
                className="flex gap-2 border-t border-white/10 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Napisz polecenie…"
                  className="glass-field min-w-0 flex-1 rounded-full px-4 py-2.5 text-sm"
                  disabled={busy}
                />
                <Button type="submit" disabled={busy || !input.trim()}>
                  Wyślij
                </Button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
