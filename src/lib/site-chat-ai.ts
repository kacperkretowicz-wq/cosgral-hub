/**
 * Auto-reply for public site chat (cosgral.pl widget).
 * Uses Gemini → Groq/OpenRouter → smart heuristic FAQ.
 */
import {
  geminiGenerateContentUrl,
  isGeminiConfigured,
} from "@/lib/gemini-offer";
import { getFreeAiProvider, isFreeAiConfigured } from "@/lib/free-ai-offer";

export type SiteChatHistoryTurn = {
  role: "visitor" | "agent";
  body: string;
};

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
7) Sklepy (WooCommerce / e-commerce) — katalog, UX, płatności, integracje.

Zasady odpowiedzi:
- Max 2–4 krótkie zdania + opcjonalnie 1 pytanie doprecyzowujące.
- Czytaj historię rozmowy. Jeśli gość JUŻ opisał cel (np. sklep WooCommerce, liczbę produktów, termin) — NIE pytaj ponownie „opisz cel”. Odnieś się do tego i zaproponuj konkretny następny krok.
- Nie wymyślaj konkretnych cen „od–do” w PLN bez briefu — zaproponuj bezpłatny audyt / rozmowę (Kontakt na stronie).
- Nie obiecuj terminów „na jutro” bez kontekstu.
- Nie podawaj danych osobowych zespołu poza imionami Jakub/Kacper.
- Jeśli ktoś pyta o portfolio — wskaż Realizacje / Systemy na stronie.
- Jeśli pytanie nie dotyczy usług Cosgral — grzecznie zawróć do tematu współpracy.
- Nie używaj markdown list z gwiazdkami; zwykły tekst, ewentualnie myślniki.
- Nie pisz „jako model AI” — jesteś asystentem Cosgral.

Zwróć WYŁĄCZNIE samą treść odpowiedzi (bez cudzysłowów, bez JSON).`;

function extractGeminiText(payload: {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
}): string {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((p) => (typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();
  return text;
}

async function callGeminiText(
  user: string,
  history: SiteChatHistoryTurn[],
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("no gemini");

  const contents: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }> = [];

  for (const turn of history.slice(-10)) {
    const text = turn.body.trim();
    if (!text) continue;
    contents.push({
      role: turn.role === "agent" ? "model" : "user",
      parts: [{ text }],
    });
  }
  contents.push({ role: "user", parts: [{ text: user }] });

  while (contents.length && contents[0].role !== "user") {
    contents.shift();
  }

  const response = await fetch(geminiGenerateContentUrl(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        temperature: 0.45,
        // 2.5-flash thinks by default; low cap → MAX_TOKENS / empty replies
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    error?: { message?: string; code?: number };
  };

  if (!response.ok) {
    const msg = payload.error?.message || JSON.stringify(payload).slice(0, 180);
    throw new Error(`Gemini ${response.status}: ${msg}`);
  }

  const out = extractGeminiText(payload);
  if (!out) throw new Error("empty gemini");
  return out;
}

async function callFreeText(
  user: string,
  history: SiteChatHistoryTurn[],
): Promise<string> {
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

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> =
    [{ role: "system", content: SYSTEM_PROMPT }];

  for (const turn of history.slice(-10)) {
    const text = turn.body.trim();
    if (!text) continue;
    messages.push({
      role: turn.role === "agent" ? "assistant" : "user",
      content: text,
    });
  }
  messages.push({ role: "user", content: user });

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
      messages,
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

function looksLikeProjectBrief(message: string): boolean {
  const t = message.toLowerCase();
  if (message.trim().length >= 35) return true;
  return /(woocommerce|sklep|e-?commerce|produkt|stron|landing|crm|seo|automat|wideo|reel|sklep|multipage|one.?page|aplikac|mvp)/i.test(
    t,
  );
}

/** Fallback when no AI keys / provider down — still useful on-site. */
export function heuristicSiteChatReply(
  message: string,
  history: SiteChatHistoryTurn[] = [],
): string {
  const t = message.toLowerCase();
  const priorVisitor = history
    .filter((h) => h.role === "visitor")
    .map((h) => h.body)
    .join(" ")
    .toLowerCase();
  const combined = `${priorVisitor} ${t}`;

  if (/(cena|koszt|ile\s+koszt|wycen|bud[zż]et|cennik)/i.test(t)) {
    return "Cena zależy od zakresu (np. landing vs multipage, CRM, sklep, automatyzacje). Napisz krótko, czego potrzebujesz — zaproponujemy bezpłatny audyt i orientacyjny zakres. Możesz też zostawić kontakt w sekcji Kontakt.";
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
  if (/(cze[sś][cć]|hej|dzie[nń] dobry|witam|hello|hi\b)/i.test(t) && !looksLikeProjectBrief(message)) {
    return "Cześć! Tu Cosgral — strony, sklepy, aplikacje, CRM, automatyzacje, SEO i wideo. W czym możemy pomóc?";
  }

  if (
    /(woocommerce|sklep|e-?commerce|produkt)/i.test(combined) ||
    (looksLikeProjectBrief(message) && /(sklep|woo|elektronik|produkt)/i.test(t))
  ) {
    return "Jasne — sklep WooCommerce. Przy większym katalogu i starcie w perspektywie kilku miesięcy sensowny jest plan: struktura kategorii → karty produktu/UX → płatności i dostawy → SEO. Chcesz checklistę startową, czy od razu umawiamy krótki bezpłatny audyt?";
  }

  if (looksLikeProjectBrief(message)) {
    return "Dzięki, mam kontekst. Na tej bazie możemy rozpisać zakres i kolejne kroki. Napisz mail/telefon w Kontakt albo powiedz, czy wolisz najpierw krótką checklistę — odpiszemy z propozycją.";
  }

  return "Dzięki za wiadomość. Opisz proszę krótko cel (strona, sklep, CRM, automatyzacja, SEO lub wideo) — odpiszemy z kolejnym krokiem albo zaprosimy na bezpłatny audyt.";
}

export async function generateSiteChatReply(input: {
  body: string;
  page_url?: string;
  history?: SiteChatHistoryTurn[];
}): Promise<{ reply: string; provider: "gemini" | "free" | "heuristic" }> {
  const history = input.history ?? [];
  const user = [
    input.body.trim().slice(0, 2000),
    input.page_url ? `Strona: ${input.page_url}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (isGeminiConfigured()) {
    try {
      return {
        reply: await callGeminiText(user, history),
        provider: "gemini",
      };
    } catch (err) {
      console.error(
        "[site-chat-ai] gemini failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (isFreeAiConfigured()) {
    try {
      return {
        reply: await callFreeText(user, history),
        provider: "free",
      };
    } catch (err) {
      console.error(
        "[site-chat-ai] free ai failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  return {
    reply: heuristicSiteChatReply(input.body, history),
    provider: "heuristic",
  };
}
