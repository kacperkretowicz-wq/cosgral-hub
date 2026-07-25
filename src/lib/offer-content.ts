import {
  getOfferClosing,
  getOfferIntro,
  getOfferSections,
  type OfferData,
  type OfferSection,
} from "./offer-templates";
import type { Inspiration } from "./types";

export interface OfferContent {
  intro: string;
  sections: OfferSection[];
  closing: string;
}

export type OfferContentSection = OfferSection;

export function buildDefaultOfferContent(data: OfferData): OfferContent {
  return {
    intro: getOfferIntro(data),
    sections: getOfferSections(data),
    closing: getOfferClosing(data),
  };
}

export function offerContentToText(content: OfferContent): string {
  const parts = [content.intro.trim()];

  for (const section of content.sections) {
    parts.push("");
    parts.push(
      `${section.number ? `${section.number}. ` : ""}${section.title}`.trim(),
    );
    for (const item of section.items) {
      parts.push(`• ${item}`);
    }
  }

  parts.push("");
  parts.push(content.closing.trim());
  return parts.join("\n");
}

export function buildDefaultOfferText(data: OfferData): string {
  return offerContentToText(buildDefaultOfferContent(data));
}

export function formatInspirationsBlock(inspirations: Inspiration[]): string {
  if (!inspirations.length) return "";

  const parts = inspirations.map((item, index) => {
    const lines = [`${index + 1}. ${item.name}`, `🔗 Link: ${item.url}`];
    if (item.whyFit) lines.push(` Dlaczego ten wzór: ${item.whyFit}`);
    if (item.layout) lines.push(` Układ i wizualizacje: ${item.layout}`);
    if (item.whyWorks) lines.push(` Dlaczego to działa: ${item.whyWorks}`);
    return lines.join("\n");
  });

  return `\n\n${parts.join("\n\n")}`;
}

function textIncludesInspirations(text: string, inspirations: Inspiration[]): boolean {
  const normalized = text.toLowerCase();
  return inspirations.some((item) => normalized.includes(item.url.toLowerCase()));
}

export function hasOfferSignature(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("cosgral.agency") ||
    normalized.includes("pozdrawiamy,") ||
    normalized.includes("kacper kosikowski")
  );
}

export function resolveOfferText(
  offerText: string | null | undefined,
  offerContent: OfferContent | null | undefined,
  data: OfferData,
): string {
  if (offerText?.trim()) return offerText.trim();

  let text = offerContent
    ? offerContentToText(offerContent)
    : buildDefaultOfferText(data);

  const inspirations = data.inspirations ?? [];
  if (inspirations.length > 0 && !textIncludesInspirations(text, inspirations)) {
    text += formatInspirationsBlock(inspirations);
  }

  return text;
}

export function resolveOfferDisplay(
  offerText: string | null | undefined,
  offerContent: OfferContent | null | undefined,
  data: OfferData,
): { body: string; showFooter: boolean } {
  const body = resolveOfferText(offerText, offerContent, data);
  const usingCustomText = Boolean(offerText?.trim());

  return {
    body,
    showFooter: !usingCustomText || !hasOfferSignature(body),
  };
}

export function parseOfferContent(value: unknown): OfferContent | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.intro !== "string" || typeof record.closing !== "string") {
    return null;
  }
  if (!Array.isArray(record.sections)) return null;

  const sections = record.sections
    .map((section) => {
      if (!section || typeof section !== "object") return null;
      const item = section as Record<string, unknown>;
      if (typeof item.title !== "string" || !Array.isArray(item.items)) {
        return null;
      }
      return {
        number: typeof item.number === "string" ? item.number : "",
        title: item.title,
        items: item.items.filter((entry): entry is string => typeof entry === "string"),
      };
    })
    .filter(Boolean) as OfferSection[];

  return {
    intro: record.intro,
    sections,
    closing: record.closing,
  };
}
