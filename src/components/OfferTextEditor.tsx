"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface OfferChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface OfferTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  companyName: string;
  industry: string;
  pageType: "onepage" | "multipage";
  deadline: string;
  chatMessages: OfferChatMessage[];
  onChatMessagesChange: (messages: OfferChatMessage[]) => void;
}

function formatApiError(error: unknown): string {
  if (typeof error === "string") return error;
  if (Array.isArray(error)) {
    return error.map((item) => JSON.stringify(item)).join(", ");
  }
  return "Błąd AI";
}

export function OfferTextEditor({
  value,
  onChange,
  companyName,
  industry,
  pageType,
  deadline,
  chatMessages,
  onChatMessagesChange,
}: OfferTextEditorProps) {
  const [generating, setGenerating] = useState(false);
  const [chatting, setChatting] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [error, setError] = useState("");

  const contextBody = {
    company_name: companyName,
    industry,
    page_type: pageType,
    deadline: deadline || undefined,
  };

  const handleGenerate = async () => {
    if (!companyName.trim()) return;

    setGenerating(true);
    setError("");

    const res = await fetch("/api/offer/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contextBody),
    });

    const data = await res.json();
    setGenerating(false);

    if (!res.ok) {
      setError(formatApiError(data.error));
      return;
    }

    onChange(data.offer_text);
    onChatMessagesChange([
      {
        role: "assistant",
        content: data.reply,
      },
    ]);
  };

  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !value.trim() || !companyName.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatting(true);
    setError("");

    const nextMessages: OfferChatMessage[] = [
      ...chatMessages,
      { role: "user", content: userMessage },
    ];
    onChatMessagesChange(nextMessages);

    const history = nextMessages
      .slice(0, -1)
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({
        role: (message.role === "assistant" ? "model" : "user") as "user" | "model",
        text: message.content,
      }));

    const res = await fetch("/api/offer/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...contextBody,
        offer_text: value,
        message: userMessage,
        history,
      }),
    });

    const data = await res.json();
    setChatting(false);

    if (!res.ok) {
      setError(formatApiError(data.error));
      onChatMessagesChange(chatMessages);
      return;
    }

    onChange(data.offer_text);
    onChatMessagesChange([
      ...nextMessages,
      { role: "assistant", content: data.reply },
    ]);
  };

  return (
    <div className="space-y-4 rounded-sm border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white/90">Treść oferty</p>
          <p className="text-xs text-white/40">
            Pisz ręcznie albo wygeneruj AI na bazie szablonu Cosgral — potem
            rozmawiaj z Gemini, żeby coś zmienić.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleGenerate}
          disabled={generating || !companyName.trim()}
          className="px-4 py-2 text-xs"
        >
          {generating ? "Generowanie..." : "Generuj AI"}
        </Button>
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-white/70">Treść oferty</label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={18}
          placeholder="Wpisz treść oferty ręcznie lub kliknij „Generuj AI”…"
          className="w-full rounded-sm border border-white/20 bg-black/30 px-3 py-2 text-sm leading-relaxed"
        />
      </div>

      {(chatMessages.length > 0 || value.trim()) && (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <p className="text-sm font-medium text-white/80">Czat z Gemini</p>

          {chatMessages.length > 0 && (
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-sm bg-black/20 p-3">
              {chatMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-sm px-3 py-2 text-sm ${
                    message.role === "user"
                      ? "ml-6 bg-white/10 text-white/90"
                      : "mr-6 bg-white/5 text-white/70"
                  }`}
                >
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-white/30">
                    {message.role === "user" ? "Ty" : "Gemini"}
                  </p>
                  <p className="whitespace-pre-line">{message.content}</p>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleChatSend} className="flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder='np. „Skróć sekcję portfolio” lub „Dodaj inspiracje stron beauty”'
              className="flex-1"
              disabled={!value.trim() || chatting}
            />
            <Button type="submit" disabled={chatting || !chatInput.trim() || !value.trim()}>
              {chatting ? "..." : "Wyślij"}
            </Button>
          </form>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
