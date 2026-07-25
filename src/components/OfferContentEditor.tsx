"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { OfferContent } from "@/lib/offer-content";

interface OfferContentEditorProps {
  value: OfferContent | null;
  onChange: (value: OfferContent) => void;
  onGenerate: () => Promise<void>;
  generating: boolean;
  companyName: string;
}

export function OfferContentEditor({
  value,
  onChange,
  onGenerate,
  generating,
  companyName,
}: OfferContentEditorProps) {
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>(
    {},
  );

  if (!value) {
    return (
      <div className="space-y-3 rounded-sm border border-white/10 bg-white/5 p-4">
        <div>
          <p className="text-sm font-medium text-white/90">Tekst oferty</p>
          <p className="text-xs text-white/40">
            Gemini zaproponuje treść dopasowaną do branży — potem możesz ją
            edytować przed wysłaniem.
          </p>
        </div>
        <Button
          type="button"
          onClick={onGenerate}
          disabled={generating || !companyName.trim()}
        >
          {generating ? "Generowanie tekstu..." : "Zaproponuj tekst (Gemini)"}
        </Button>
      </div>
    );
  }

  const updateSection = (
    index: number,
    patch: Partial<OfferContent["sections"][number]>,
  ) => {
    onChange({
      ...value,
      sections: value.sections.map((section, i) =>
        i === index ? { ...section, ...patch } : section,
      ),
    });
  };

  return (
    <div className="space-y-4 rounded-sm border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white/90">Tekst oferty</p>
          <p className="text-xs text-white/40">
            Edytuj treść przed wygenerowaniem linku dla klienta.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={onGenerate}
          disabled={generating || !companyName.trim()}
          className="px-4 py-2 text-xs"
        >
          {generating ? "Ponowne generowanie..." : "Wygeneruj ponownie (Gemini)"}
        </Button>
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-white/70">Wstęp</label>
        <textarea
          value={value.intro}
          onChange={(e) => onChange({ ...value, intro: e.target.value })}
          rows={6}
          className="w-full rounded-sm border border-white/20 bg-black/30 px-3 py-2 text-sm leading-relaxed"
        />
      </div>

      <div className="space-y-3">
        {value.sections.map((section, index) => (
          <div
            key={`${section.number}-${section.title}-${index}`}
            className="rounded-sm border border-white/10 bg-black/20 p-3 space-y-2"
          >
            <button
              type="button"
              onClick={() =>
                setExpandedSections((prev) => ({
                  ...prev,
                  [index]: !prev[index],
                }))
              }
              className="flex w-full items-center justify-between text-left text-sm font-medium text-white/80"
            >
              <span>
                {section.number ? `${section.number}. ` : ""}
                {section.title}
              </span>
              <span className="text-xs text-white/40">
                {expandedSections[index] ? "▼" : "▶"}
              </span>
            </button>

            {expandedSections[index] && (
              <div className="space-y-2 pt-2">
                <input
                  value={section.title}
                  onChange={(e) =>
                    updateSection(index, { title: e.target.value })
                  }
                  className="w-full rounded-sm border border-white/20 bg-black/30 px-3 py-2 text-sm"
                  placeholder="Tytuł sekcji"
                />
                <textarea
                  value={section.items.join("\n")}
                  onChange={(e) =>
                    updateSection(index, {
                      items: e.target.value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean),
                    })
                  }
                  rows={5}
                  placeholder="Jeden punkt na linię"
                  className="w-full rounded-sm border border-white/20 bg-black/30 px-3 py-2 text-sm leading-relaxed"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-white/70">Zakończenie</label>
        <textarea
          value={value.closing}
          onChange={(e) => onChange({ ...value, closing: e.target.value })}
          rows={4}
          className="w-full rounded-sm border border-white/20 bg-black/30 px-3 py-2 text-sm leading-relaxed"
        />
      </div>
    </div>
  );
}
