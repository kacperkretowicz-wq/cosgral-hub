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
