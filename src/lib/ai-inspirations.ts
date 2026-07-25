import OpenAI from "openai";
import type { Inspiration } from "./types";

const EXAMPLE_STYLE = `
Przykład tonu i struktury (NIE kopiuj tych stron — generuj nowe, dopasowane):

1. NITEX — https://nitex.com/
   Dlaczego: Industrialna precyzja + SaaS minimalizm. Surowa siatka, czysta typografia.
   Dlaczego działa: Pokazuje twardą logistykę i system zamiast chaosu.

2. Juice Agency — https://www.juice.agency/
   Dlaczego: Odważny, edgy design. Sound & Motion, mocny kontrast.
   Dlaczego działa: Pozycjonuje jako trendsetter, buduje ekskluzywność.

3. TRUUS — https://truus.co/
   Dlaczego: Minimalizm z nutą Y2K/retro-tech.
   Dlaczego działa: Styl bez utraty czytelności dla decydentów.
`;

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/** Wyodrębnia inspiracje z wklejonego tekstu — bez wymyślania nowych. */
export async function extractInspirationsFromText(
  text: string,
): Promise<Inspiration[]> {
  const { parseInspirationsText } = await import("./inspiration-utils");
  const local = parseInspirationsText(text);
  if (local.length > 0) return local;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "Nie rozpoznano formatu tekstu. Użyj numerowanej listy (1. Nazwa, Link, opisy…).",
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: `Wyodrębnij inspiracje stron WWW z podanego tekstu użytkownika.
ZASADY:
- Tylko to, co jest w tekście — NIE dodawaj nowych stron ani URL-i
- Odpowiedź JSON: { "inspirations": [{ "name", "url", "whyFit", "layout", "whyWorks" }] }
- Pola whyFit = "Dlaczego ten wzór", layout = "Układ i wizualizacje", whyWorks = "Dlaczego to działa"
- Język: polski, zachowaj treść użytkownika`,
      },
      {
        role: "user",
        content: text,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI nie zwróciło wyniku");

  const parsed = JSON.parse(content) as { inspirations: Inspiration[] };
  if (!Array.isArray(parsed.inspirations) || !parsed.inspirations.length) {
    throw new Error("Nie znaleziono inspiracji w tekście");
  }

  return parsed.inspirations.map((item) => ({
    name: item.name?.trim() ?? "",
    url: item.url?.trim() ?? "",
    whyFit: item.whyFit?.trim() ?? "",
    layout: item.layout?.trim() ?? "",
    whyWorks: item.whyWorks?.trim() ?? "",
  }));
}

export async function generateInspirations(
  companyName: string,
  industry: string,
  pageType: string,
): Promise<Inspiration[]> {
  if (!process.env.OPENAI_API_KEY) {
    return getFallbackInspirations(companyName, industry);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Jesteś ekspertem od web designu w agencji kreatywnej Cosgral.
Generujesz propozycje ISTNIEJĄCYCH stron internetowych jako inspiracje dla klientów.
Odpowiedź w JSON: { "inspirations": [{ "name": "", "url": "", "whyFit": "", "layout": "", "whyWorks": "" }] }
Wygeneruj 5-7 propozycji. Język: polski. URL muszą być prawdziwe, działające strony.
${EXAMPLE_STYLE}`,
      },
      {
        role: "user",
        content: `Firma: ${companyName}
Branża: ${industry || "nie podano"}
Typ strony: ${pageType === "multipage" ? "wielostronicowa" : "one-page"}

Wygeneruj 5-7 unikalnych propozycji stron internetowych jako inspiracji.`,
      },
    ],
    temperature: 0.8,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return getFallbackInspirations(companyName, industry);

  try {
    const parsed = JSON.parse(content) as { inspirations: Inspiration[] };
    if (Array.isArray(parsed.inspirations) && parsed.inspirations.length > 0) {
      return parsed.inspirations;
    }
  } catch {
    // fall through
  }

  return getFallbackInspirations(companyName, industry);
}

function getFallbackInspirations(
  companyName: string,
  industry: string,
): Inspiration[] {
  return [
    {
      name: "Awwwards — Portfolio Sites",
      url: "https://www.awwwards.com/websites/portfolio/",
      whyFit: `Kuracja najlepszych stron portfolio — idealna baza inspiracji dla ${companyName} w branży ${industry || "kreatywnej"}.`,
      layout: "Duże kadry wizualne, minimalistyczna nawigacja, mocny kontrast typograficzny.",
      whyWorks: "Pokazuje standard premium bez przeładowania treścią — klient ocenia pracę oczami.",
    },
    {
      name: "Locomotive",
      url: "https://locomotive.ca/en",
      whyFit: "Agencja interaktywna z naciskiem na motion design i scroll experience.",
      layout: "Płynne animacje, pełnoekranowe sekcje, interaktywna nawigacja.",
      whyWorks: "Buduje wrażenie nowoczesności i dbałości o detale — kluczowe dla marki premium.",
    },
    {
      name: "Resn",
      url: "https://resn.co.nz/",
      whyFit: "Odważna estetyka z naciskiem na case studies i wizualną narrację.",
      layout: "Modułowy grid, kinowe ujęcia realizacji, redukcjonistyczna paleta.",
      whyWorks: "Case studies jako główny argument sprzedażowy — idealne dla branży opartej na portfolio.",
    },
    {
      name: "Active Theory",
      url: "https://activetheory.net/",
      whyFit: "Immersywne doświadczenia webowe z mocnym brandingiem.",
      layout: "WebGL, pełnoekranowe wideo, eksperymentalna typografia.",
      whyWorks: "Natychmiastowe wyróżnienie się — strona sama jest dowodem kreatywności.",
    },
    {
      name: "Basement Studio",
      url: "https://basement.studio/",
      whyFit: "Brutalistyczny minimalizm z naciskiem na proces i wyniki.",
      layout: "Surowa siatka, techniczna typografia, duże bloki treści.",
      whyWorks: "Komunikuje profesjonalizm i transparentność — buduje zaufanie B2B.",
    },
  ];
}
