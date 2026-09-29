/**
 * COSGRAL SM — AI Content Generation
 * Uses Gemini (already available via GEMINI_API_KEY) for text generation.
 * Images: DALL-E 3 via OpenAI (OPENAI_API_KEY) or placeholder when unavailable.
 */

import type { SmPlatform, SmPostType } from "./sm-db";

// ── Brand config ─────────────────────────────────────────────────────────

const BRAND_VOICE = `
Jesteś copywriterem agencji cyfrowej Cosgral (cosgral.pl).
Cosgral to dwuosobowa agencja (Jakub + Kacper) — budują strony WWW, aplikacje, CRM, automatyzacje, SEO i grafiki/wideo dla polskich firm MŚP.

ZASADY:
- Ton: merytoryczny, bezpośredni, partnerski — NIE korporacyjny
- Język: polski, prosty, bez buzzwordów
- Zdania krótkie, aktywna forma
- Max 2 emoji w całym poście
- Zawsze kończ pytaniem lub subtelnym CTA
- NIE pisz: "W dynamicznie zmieniającym się...", clickbait, nadmiar wykrzykników
`;

// Temat posta wg dnia tygodnia
export const WEEKDAY_THEMES: Record<number, { theme: string; label: string; platforms: SmPlatform[]; post_type: SmPostType }> = {
  1: { theme: "case_study",    label: "Case study",         platforms: ["instagram", "facebook"], post_type: "carousel" },
  2: { theme: "ai_education",  label: "AI & edukacja",      platforms: ["linkedin", "instagram"], post_type: "static"   },
  3: { theme: "tip",           label: "Tip tygodnia",       platforms: ["instagram", "facebook"], post_type: "story"    },
  4: { theme: "behind_scenes", label: "Behind the scenes",  platforms: ["instagram"],             post_type: "static"   },
  5: { theme: "opinion",       label: "Hot take / opinia",  platforms: ["linkedin", "facebook"],  post_type: "static"   },
  6: { theme: "meme",          label: "Meme / estetyczny",  platforms: ["instagram", "facebook"], post_type: "static"   },
  0: { theme: "teaser",        label: "Teaser tygodnia",    platforms: ["instagram"],             post_type: "story"    },
};

const THEME_PROMPTS: Record<string, string> = {
  case_study: `Napisz post (karuzela) o realizacji agencji Cosgral.
FORMAT: Każdy slajd osobno — SLAJD 1: Hook (liczba lub efekt), SLAJD 2: Problem klienta, SLAJD 3: Rozwiązanie, SLAJD 4: Efekty (liczby), SLAJD 5: Wniosek, SLAJD 7: CTA "Masz podobny problem? Napisz."
CAPTION: 3-5 zdań + pytanie do obserwujących + 20 hashtagów #cosgral #agencjadigitalna #automatyzacja ...`,

  ai_education: `Napisz edukacyjny post o AI i jej wpływie na biznes/rynek pracy.
WERSJA LINKEDIN (200-250 słów): hook kontrowersyjny → 3 konkretne fakty → perspektywa dla polskich firm → pytanie
WERSJA INSTAGRAM CAPTION (100 słów): luźniejsza wersja
Hashtagi LinkedIn (5-7): #AI #automatyzacja #agencjadigitalna...
Hashtagi Instagram (15-20): #sztucznainteligencja #AI #rynekpracy...`,

  tip: `Napisz praktyczny tip tygodnia z digital marketingu, UX, SEO lub automatyzacji.
TYTUŁ GRAFIKI: max 5 słów CAPS LOCK
PODTYTUŁ: 1 zdanie
CAPTION: tip w 3 krokach + "Zapisz ten post 📌" + pytanie + 15-20 hashtagów`,

  behind_scenes: `Napisz post "za kulisami" — dzień w agencji Cosgral lub proces realizacji projektu.
TEKST NA GRAFICE: 1-2 linie, max 8 słów
CAPTION: historia procesu pierwszoosobowo (my — Jakub i Kacper), 100-150 słów + pytanie + hashtagi`,

  opinion: `Napisz odważną opinię o trendach w AI, digital lub web designie.
Zacznij od kontrowersyjnego zdania. Uzasadnij faktami. Przyznaj kontrargument. Zakończ pytaniem.
WERSJA LINKEDIN (200-300 słów):
WERSJA INSTAGRAM (100-150 słów):
Hashtagi obie wersje.`,

  meme: `Stwórz estetyczny sobotni post Cosgral.
OPCJA A — Cytat/Maxima: max 12 słów na grafice + "— Cosgral"
OPCJA B — Relatable branżowy meme (agencja, dev, klient)
CAPTION: 40-60 słów + "Taguj znajomego który to czuje 👀" + hashtagi`,

  teaser: `Napisz teaser na Stories o tym co w przyszłym tygodniu (case study, post o AI, tip).
STORY TEKST: "W tym tygodniu:" + 3-4 punkty intrygująco + "Obserwuj żeby nie przegapić"
CAPTION pod story: 30-50 słów`,
};

// ── Gemini text generation ────────────────────────────────────────────────

export async function generateCaption(opts: {
  theme: string;
  platform: SmPlatform;
  customTopic?: string;
}): Promise<{ caption: string; hashtags: string[]; imagePrompt: string }> {
  const prompt = THEME_PROMPTS[opts.theme] ?? THEME_PROMPTS.tip;
  const topicNote = opts.customTopic ? `\nTemat: ${opts.customTopic}` : "";

  const fullPrompt = `${BRAND_VOICE}\n\n${prompt}${topicNote}`;

  // Try Gemini first (available in production)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: { temperature: 0.85, maxOutputTokens: 1200 },
          }),
        },
      );
      const data = await res.json();
      const text: string =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      return parseGeneratedText(text, opts.theme);
    } catch {
      // fall through
    }
  }

  // Fallback: placeholder content
  return {
    caption: `[${opts.theme.toUpperCase()}] Post wygenerowany przez Cosgral SM System dla platformy ${opts.platform}. Uzupełnij treść ręcznie lub skonfiguruj OPENAI_API_KEY / GEMINI_API_KEY.`,
    hashtags: ["#cosgral", "#agencjadigitalna", "#webdesign", "#automatyzacja", "#AI"],
    imagePrompt: `${opts.theme} digital agency minimal dark aesthetic`,
  };
}

function parseGeneratedText(text: string, theme: string) {
  // Extract hashtags
  const hashtagMatches = text.match(/#[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+/g) ?? [];
  const hashtags = [...new Set(hashtagMatches)].slice(0, 25);

  // Build image prompt from theme
  const imageContextMap: Record<string, string> = {
    case_study:     "professional digital product showcase, clean interface, dark background",
    ai_education:   "abstract AI neural network visualization, data flow, futuristic dark",
    tip:            "clean typographic layout, geometric shapes, informational minimal",
    behind_scenes:  "developer workspace, monitors, modern dark studio",
    opinion:        "bold typographic statement, abstract geometric dark",
    meme:           "clean editorial dark design, witty typography",
    teaser:         "mysterious dark composition, coming soon, abstract",
  };
  const imagePrompt = `${imageContextMap[theme] ?? "abstract digital art"}, minimal dark aesthetic, deep black background, off-white typography, clean composition, Swiss design influence, NO TEXT, NO FACES`;

  return { caption: text.trim(), hashtags, imagePrompt };
}

// ── Image generation (OpenAI DALL-E 3) ────────────────────────────────────

export async function generateImage(opts: {
  prompt: string;
  postType: SmPostType;
}): Promise<string | null> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return null;

  const sizeMap: Record<SmPostType, string> = {
    static:   "1024x1024",
    carousel: "1024x1024",
    story:    "1024x1792",
    reel:     "1024x1792",
    text:     "1024x1024",
  };

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: opts.prompt,
        size: sizeMap[opts.postType],
        quality: "standard",
        n: 1,
      }),
    });
    const data = await res.json();
    return data?.data?.[0]?.url ?? null;
  } catch {
    return null;
  }
}
