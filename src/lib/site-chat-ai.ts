/**
 * Auto-reply for public site chat (cosgral.pl widget).
 * Uses Gemini → Groq/OpenRouter → heuristic FAQ.
 */
import {
  geminiGenerateContentUrl,
  isGeminiConfigured,
} from "@/lib/gemini-offer";
import { getFreeAiProvider, isFreeAiConfigured } from "@/lib/free-ai-offer";

const SYSTEM_PROMPT = `Jesteś asystentem live czatu na stronie agencji COSGRAL (cosgral.pl).
Odpowiadasz po polsku, krótko, konkretnie, w tonie profesjonalnym i przyjacielskim.

Kim jesteście:
- Dwuosobowy zespół (Jakub + Kacper): strony WWW, aplikacje, CRM, automatyzacje, SEO/GEO, grafika i montaż wideo.
- Realizacje m.in. TelForceOne (CRM + narzędzia), strony web, montaż, systemy sklepowe.

Usługi (skrót):
1) Strony internetowe — landingi i multipage, mocny design, animacje, SEO.
2) Aplikacje — panele, narzędzia wewnętrzne, MVP.
3) SEO & GEO — widoczność w Google i lokalnie.
4) Automatyzacje — workflow (zamówienia, faktury, alerty, chatboty).
5) Systemy CRM — leady, pipeline, mapa/teren.
6) Grafika i montaż wideo — social, reels, materiały reklamowe.

Zasady odpowiedzi:
- Max 2–4 krótkie zdania + opcjonalnie 1 pytanie doprecyzowujące.
- Nie wymyślaj konkretnych cen „od–do” w PLN, jeśli nie znasz briefu — zaproponuj bezpłatny audyt / rozmowę (sekcja Kontakt na stronie).
- Nie obiecuj terminów „na jutro” bez kontekstu.
- Nie podawaj danych osobowych zespołu poza imionami Jakub/Kacper.
- Jeśli ktoś pyta o portfolio — wskaż Realizacje / Systemy na stronie.
- Jeśli pytanie nie dotyczy usług Cosgral — grzecznie zawróć do tematu współpracy.
- Nie używaj markdown list z gwiazdkami; zwykły tekst, ewentualnie myślniki.
- Nie pisz „jako model AI” — jesteś asystentem Cosgral.

Zwróć WYŁĄCZNIE samą treść odpowiedzi (bez cudzysłowów, bez JSON).`;

async function callGeminiText(user: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("no gemini");

  const response = await fetch(geminiGenerateContentUrl(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${SYSTEM_PROMPT}\n\n---\nWiadomość gościa:\n${user}` }],
        },
      ],
      generationConfig: { temperature: 0.45, maxOutputTokens: 280 },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini: ${text.slice(0, 180)}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const out = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!out) throw new Error("empty gemini");
  return out;
}

async function callFreeText(user: string): Promise<string> {
  const provider = getFreeAiProvider();
  if (provider === "none") throw new Error("no free ai");

  const isGroq = provider === "groq";
  const url = isGroq
    ? "https://api.groq.com/openai/v1/chat/completions"
    : "https://openrouter.ai/api/v1/chat/completions";
  const apiKey = isGroq
    ? process.env.GROQ_API_KEY!
    : process.env.OPENROUTER_API_KEY!;
  const model = isGroq ? "llama-3.3-70b-versatile" : "openrouter/free";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(isGroq
        ? {}
        : {
            "HTTP-Referer":
              process.env.NEXT_PUBLIC_APP_URL ?? "https://cosgralhub.netlify.app",
            "X-Title": "Cosgral Site Chat",
          }),
    },
    body: JSON.stringify({
      model,
      temperature: 0.45,
      max_tokens: 280,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Free AI: ${text.slice(0, 180)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const out = payload.choices?.[0]?.message?.content?.trim();
  if (!out) throw new Error("empty free ai");
  return out;
}

/** Fallback when no AI keys / provider down — still useful on-site. */
export function heuristicSiteChatReply(message: string): string {
  const t = message.toLowerCase();

  if (/(cena|koszt|ile\s+koszt|wycen|bud[zż]et|cennik)/i.test(t)) {
    return "Cena zależy od zakresu (np. landing vs multipage, CRM, automatyzacje). Napisz krótko, czego potrzebujesz — zaproponujemy bezpłatny audyt i orientacyjny zakres. Możesz też zostawić kontakt w sekcji Kontakt.";
  }
  if (/(seo|pozycjon|google|geo)/i.test(t)) {
    return "Robimy SEO i GEO pod widoczność w Google oraz lokalnie. Powiedz, czy chodzi o nową stronę, czy o poprawę istniejącej — podpowiemy pierwszy krok.";
  }
  if (/(crm|lead|pipeline|handlow)/i.test(t)) {
    return "Budujemy CRM pod realną sprzedaż: leady, pipeline, notatki i procesy zespołu. Opisz, jak dziś zbieracie leady — dopasujemy prosty start.";
  }
  if (/(automat|workflow|chatbot|n8n|zapier|integrac)/i.test(t)) {
    return "Automatyzujemy powtarzalne procesy (zamówienia, statusy, alerty, chatboty). Napisz, co zajmuje Wam najwięcej czasu — wskażemy, co da się odciążyć pierwsze.";
  }
  if (/(wideo|reel|monta[zż]|grafik|social)/i.test(t)) {
    return "Robimy montaż (reels/reklamy) i grafikę social. Powiedz format i cel (np. IG Reels, ads) — podpowiemy zakres.";
  }
  if (/(portfolio|realizacj|przyk[lł]ad)/i.test(t)) {
    return "Przykłady są w Realizacjach (strony, montaż, grafiki) oraz w Systemach (m.in. TelForceOne). Chcesz link do konkretnego typu projektu?";
  }
  if (/(cze[sś][cć]|hej|dzie[nń] dobry|witam|hello|hi\b)/i.test(t)) {
    return "Cześć! Tu Cosgral — strony, aplikacje, CRM, automatyzacje, SEO i wideo. W czym możemy pomóc?";
  }

  return "Dzięki za wiadomość. Opisz proszę krótko cel (strona, CRM, automatyzacja, SEO lub wideo) — odpiszemy z kolejnym krokiem albo zaprosimy na bezpłatny audyt.";
}

export async function generateSiteChatReply(input: {
  body: string;
  page_url?: string;
}): Promise<{ reply: string; provider: "gemini" | "free" | "heuristic" }> {
  const user = [
    input.body.trim().slice(0, 2000),
    input.page_url ? `Strona: ${input.page_url}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (isGeminiConfigured()) {
    try {
      return { reply: await callGeminiText(user), provider: "gemini" };
    } catch {
      /* fall through */
    }
  }

  if (isFreeAiConfigured()) {
    try {
      return { reply: await callFreeText(user), provider: "free" };
    } catch {
      /* fall through */
    }
  }

  return { reply: heuristicSiteChatReply(input.body), provider: "heuristic" };
}
