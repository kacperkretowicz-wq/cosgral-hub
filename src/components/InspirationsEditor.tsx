"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { parseInspirationsText } from "@/lib/inspiration-utils";
import type { Inspiration } from "@/lib/types";

type DraftInspiration = Inspiration & { id: string };
type Mode = "paste" | "manual";

function createDraft(partial?: Partial<Inspiration>): DraftInspiration {
  return {
    id: crypto.randomUUID(),
    name: partial?.name ?? "",
    url: partial?.url ?? "",
    whyFit: partial?.whyFit ?? "",
    layout: partial?.layout ?? "",
    whyWorks: partial?.whyWorks ?? "",
  };
}

function toDrafts(items: Inspiration[]): DraftInspiration[] {
  return items.map((item) => createDraft(item));
}

interface InspirationsEditorProps {
  value: Inspiration[];
  onChange: (value: Inspiration[]) => void;
}

export function InspirationsEditor({
  value,
  onChange,
}: InspirationsEditorProps) {
  const [mode, setMode] = useState<Mode>("paste");
  const [pasteText, setPasteText] = useState("");
  const [drafts, setDrafts] = useState<DraftInspiration[]>(() => toDrafts(value));
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const applyInspirations = (items: Inspiration[]) => {
    onChange(items);
    setDrafts(toDrafts(items));
    setError("");
    setMode("manual");
  };

  const syncDrafts = (next: DraftInspiration[]) => {
    setDrafts(next);
    onChange(
      next
        .filter((item) => item.url.trim())
        .map((item) => ({
          name: item.name.trim() || item.url,
          url: item.url.trim(),
          whyFit: item.whyFit.trim(),
          layout: item.layout.trim(),
          whyWorks: item.whyWorks.trim(),
        })),
    );
  };

  const handleParse = async () => {
    setParsing(true);
    setError("");

    const local = parseInspirationsText(pasteText);
    if (local.length > 0) {
      applyInspirations(local);
      setParsing(false);
      return;
    }

    const res = await fetch("/api/inspirations/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: pasteText }),
    });

    const data = await res.json();
    setParsing(false);

    if (!res.ok) {
      setError(data.error ?? "Nie udało się uporządkować tekstu");
      return;
    }

    applyInspirations(data.inspirations ?? []);
  };

  const addDraft = () => syncDrafts([...drafts, createDraft()]);

  const updateDraft = (
    id: string,
    field: keyof Inspiration,
    fieldValue: string,
  ) => {
    syncDrafts(
      drafts.map((item) =>
        item.id === id ? { ...item, [field]: fieldValue } : item,
      ),
    );
  };

  const removeDraft = (id: string) => {
    syncDrafts(drafts.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-4 rounded-sm border border-white/10 bg-white/5 p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-white/90">Inspiracje stron</p>
        <p className="text-xs text-white/40">
          Wklej gotowy tekst albo dodaj inspiracje ręcznie — bez wymyślania
          przez AI.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("paste")}
          className={`rounded-sm px-4 py-2 text-sm transition ${
            mode === "paste"
              ? "bg-white/10 text-white"
              : "text-white/50 hover:text-white"
          }`}
        >
          Wklej tekst
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("manual");
            if (value.length) setDrafts(toDrafts(value));
          }}
          className={`rounded-sm px-4 py-2 text-sm transition ${
            mode === "manual"
              ? "bg-white/10 text-white"
              : "text-white/50 hover:text-white"
          }`}
        >
          Ręcznie
        </button>
      </div>

      {mode === "paste" ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="block text-sm text-white/70">
              Wklej inspiracje (format z numeracją)
            </label>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={12}
              placeholder={`1. NITEX
🔗 Link: https://nitex.com/
 Dlaczego ten wzór: ...
 Układ i wizualizacje: ...
 Dlaczego to działa: ...

2. Juice Agency
🔗 Link: https://www.juice.agency/
 ...`}
              className="w-full rounded-sm border border-white/20 bg-black/30 px-3 py-2 font-mono text-sm leading-relaxed"
            />
          </div>
          <Button
            type="button"
            onClick={handleParse}
            disabled={parsing || pasteText.trim().length < 10}
          >
            {parsing ? "Uporządkowywanie..." : "Uporządkuj w formularz"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.length === 0 ? (
            <p className="text-sm text-white/40">
              Brak inspiracji — dodaj pierwszą poniżej.
            </p>
          ) : (
            drafts.map((item, index) => (
              <div
                key={item.id}
                className="space-y-3 rounded-sm border border-white/10 bg-black/20 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white/70">
                    Inspiracja {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removeDraft(item.id)}
                    className="px-2 py-1 text-xs"
                  >
                    Usuń
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Nazwa strony"
                    value={item.name}
                    onChange={(e) =>
                      updateDraft(item.id, "name", e.target.value)
                    }
                    placeholder="np. NITEX"
                  />
                  <Input
                    label="Link URL"
                    type="url"
                    value={item.url}
                    onChange={(e) =>
                      updateDraft(item.id, "url", e.target.value)
                    }
                    placeholder="https://..."
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => ({
                      ...prev,
                      [item.id]: !prev[item.id],
                    }))
                  }
                  className="text-xs text-white/50 hover:text-white"
                >
                  {expanded[item.id] ? "▼ Mniej pól" : "▶ Opisy"}
                </button>

                {expanded[item.id] && (
                  <div className="grid gap-3">
                    <Input
                      label="Dlaczego ten wzór"
                      value={item.whyFit}
                      onChange={(e) =>
                        updateDraft(item.id, "whyFit", e.target.value)
                      }
                    />
                    <Input
                      label="Układ i wizualizacje"
                      value={item.layout}
                      onChange={(e) =>
                        updateDraft(item.id, "layout", e.target.value)
                      }
                    />
                    <Input
                      label="Dlaczego to działa"
                      value={item.whyWorks}
                      onChange={(e) =>
                        updateDraft(item.id, "whyWorks", e.target.value)
                      }
                    />
                  </div>
                )}
              </div>
            ))
          )}

          <Button type="button" variant="secondary" onClick={addDraft}>
            + Dodaj inspirację
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {value.length > 0 && (
        <div className="rounded-sm border border-green-500/20 bg-green-500/5 px-3 py-2 text-sm text-green-200/80">
          W formularzu: {value.length}{" "}
          {value.length === 1 ? "inspiracja" : "inspiracji"} —{" "}
          {value.map((i) => i.name).join(", ")}
        </div>
      )}
    </div>
  );
}
