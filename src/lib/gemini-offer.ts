import type { Inspiration } from "./types";
import {
  buildDefaultOfferContent,
  type OfferContent,
} from "./offer-content";
import type { OfferData } from "./offer-templates";

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function generateOfferContentWithGemini(
  data: OfferData,
  inspirations: Inspiration[] = [],
): Promise<OfferContent> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return buildDefaultOfferContent(data);
  }

  const inspirationHint =
    inspirations.length > 0
      ? `\nInspiracje wybrane przez zespół:\n${inspirations
          .map(
            (item, index) =>
              `${index + 1}. ${item.name} (${item.url}) — ${item.whyFit}`,
          )
          .join("\n")}`
      : "";

  const prompt = `Jesteś copywriterem agencji Cosgral. Przygotuj spersonalizowaną treść oferty materiałów na stronę WWW dla klienta.

Firma: ${data.companyName}
Branża: ${data.industry || "nie podano"}
Typ strony: ${data.pageType === "multipage" ? "wielostronicowa" : "one-page"}
Deadline materiałów: ${data.deadline || "do ustalenia"}${inspirationHint}

Zwróć JSON w formacie:
{
  "intro": "powitanie i wstęp (2-4 akapity, polski, ton profesjonalny i ciepły)",
  "sections": [
    { "number": "1", "title": "...", "items": ["punkt 1", "punkt 2"] }
  ],
  "closing": "zakończenie z prośbą o materiały i deadline"
}

Wymagania:
- 6-7 sekcji materiałów dopasowanych do branży klienta (Hero, O nas, Oferta/Usługi, Portfolio, Opinie, Kontakt, Branding)
- Polski język, konkretne wskazówki co klient ma dostarczyć
- Nie wymyślaj faktów o firmie — pisz ogólnie dopasowane do branży
- items to tablica stringów (każdy punkt osobno)`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API: ${errorText.slice(0, 200)}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini nie zwróciło treści oferty");
  }

  const parsed = JSON.parse(text) as OfferContent;
  if (
    typeof parsed.intro !== "string" ||
    typeof parsed.closing !== "string" ||
    !Array.isArray(parsed.sections)
  ) {
    throw new Error("Nieprawidłowy format odpowiedzi Gemini");
  }

  return {
    intro: parsed.intro.trim(),
    closing: parsed.closing.trim(),
    sections: parsed.sections.map((section) => ({
      number: section.number?.trim() ?? "",
      title: section.title?.trim() ?? "",
      items: (section.items ?? [])
        .map((item) => item.trim())
        .filter(Boolean),
    })),
  };
}
