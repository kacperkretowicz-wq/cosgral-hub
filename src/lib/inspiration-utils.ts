import { z } from "zod";
import type { Inspiration } from "./types";

export const inspirationSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  whyFit: z.string().optional().default(""),
  layout: z.string().optional().default(""),
  whyWorks: z.string().optional().default(""),
});

export type InspirationInput = z.infer<typeof inspirationSchema>;

export function normalizeInspiration(
  input: Partial<InspirationInput> & { url: string },
): Inspiration {
  let name = input.name?.trim();
  if (!name) {
    try {
      name = new URL(input.url).hostname.replace(/^www\./, "");
    } catch {
      name = input.url;
    }
  }

  return {
    name,
    url: input.url.trim(),
    whyFit: input.whyFit?.trim() ?? "",
    layout: input.layout?.trim() ?? "",
    whyWorks: input.whyWorks?.trim() ?? "",
  };
}

export function mergeInspirations(
  custom: InspirationInput[],
  ai: Inspiration[],
): Inspiration[] {
  const normalized = custom.map((item) => normalizeInspiration(item));
  const seen = new Set(normalized.map((i) => i.url.toLowerCase()));
  const merged = [...normalized];

  for (const item of ai) {
    if (!seen.has(item.url.toLowerCase())) {
      merged.push(item);
      seen.add(item.url.toLowerCase());
    }
  }

  return merged;
}

/** Parsuje wklejony tekst w formacie numerowanym (1. Nazwa, Link, opisy…) */
export function parseInspirationsText(text: string): Inspiration[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const blocks = trimmed.split(/\n(?=\d+\.\s)/).filter((b) => b.trim());
  const results: Inspiration[] = [];

  for (const block of blocks) {
    const nameMatch = block.match(/^\d+\.\s*(.+?)(?:\n|$)/);
    const urlMatch =
      block.match(/🔗?\s*Link:\s*(https?:\/\/[^\s\n]+)/i) ??
      block.match(/(https?:\/\/[^\s\n]+)/i);
    const whyFitMatch = block.match(
      /Dlaczego ten wzór:\s*([\s\S]*?)(?=\n\s*Układ i wizualizacje:|\n\s*Dlaczego to działa:|$)/i,
    );
    const layoutMatch = block.match(
      /Układ i wizualizacje:\s*([\s\S]*?)(?=\n\s*Dlaczego to działa:|$)/i,
    );
    const whyWorksMatch = block.match(/Dlaczego to działa:\s*([\s\S]*?)$/i);

    if (!urlMatch) continue;

    results.push(
      normalizeInspiration({
        name: nameMatch?.[1]?.trim() ?? "",
        url: urlMatch[1].trim(),
        whyFit: whyFitMatch?.[1]?.trim().replace(/\s+/g, " ") ?? "",
        layout: layoutMatch?.[1]?.trim().replace(/\s+/g, " ") ?? "",
        whyWorks: whyWorksMatch?.[1]?.trim().replace(/\s+/g, " ") ?? "",
      }),
    );
  }

  return results;
}
