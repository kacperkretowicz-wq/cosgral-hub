import {
  getOfferClosing,
  getOfferIntro,
  getOfferSections,
  type OfferData,
  type OfferSection,
} from "./offer-templates";

export interface OfferContent {
  intro: string;
  sections: OfferSection[];
  closing: string;
}

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

export function resolveOfferText(
  offerText: string | null | undefined,
  offerContent: OfferContent | null | undefined,
  data: OfferData,
): string {
  if (offerText?.trim()) return offerText.trim();
  if (offerContent) return offerContentToText(offerContent);
  return buildDefaultOfferText(data);
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
