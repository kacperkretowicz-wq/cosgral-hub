import {
  buildDefaultOfferText,
} from "./offer-content";
import type { OfferData } from "./offer-templates";

export interface GeminiChatMessage {
  role: "user" | "model";
  text: string;
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

async function callGemini(
  contents: Array<{ role: string; parts: Array<{ text: string }> }>,
  json = false,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Brak GEMINI_API_KEY — dodaj klucz w Netlify.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          ...(json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API: ${errorText.slice(0, 240)}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new Error("Gemini nie zwróciło odpowiedzi");
  }

  return text;
}

function buildClientContext(data: OfferData): string {
  return `Firma: ${data.companyName}
Branża: ${data.industry || "nie podano"}
Typ strony: ${data.pageType === "multipage" ? "wielostronicowa" : "one-page"}
Deadline materiałów: ${data.deadline || "do ustalenia"}`;
}

export async function generateInitialOfferText(
  data: OfferData,
): Promise<{ offer_text: string; reply: string }> {
  const template = buildDefaultOfferText(data);

  if (!isGeminiConfigured()) {
    return {
      offer_text: template,
      reply:
        "Użyto standardowego szablonu Cosgral (brak GEMINI_API_KEY). Możesz edytować ręcznie.",
    };
  }

  const prompt = `Jesteś copywriterem agencji Cosgral. Dostosuj poniższą STANDARDOWĄ ofertę materiałów na stronę WWW do klienta.
Zachowaj strukturę sekcji i ton (profesjonalny, ciepły, po polsku). Dopasuj przykłady do branży.
Nie wymyślaj faktów o firmie — pisz ogólnie, dopasowane do branży.

${buildClientContext(data)}

SZABLON DO DOSTOSOWANIA:
---
${template}
---

Zwróć JSON:
{
  "offer_text": "pełna treść oferty jako jeden tekst, zachowaj numerację sekcji",
  "reply": "krótka wiadomość po polsku do użytkownika (1-2 zdania)"
}`;

  const raw = await callGemini(
    [{ role: "user", parts: [{ text: prompt }] }],
    true,
  );

  const parsed = JSON.parse(raw) as { offer_text?: string; reply?: string };
  if (!parsed.offer_text?.trim()) {
    throw new Error("Gemini zwróciło pustą treść oferty");
  }

  return {
    offer_text: parsed.offer_text.trim(),
    reply: parsed.reply?.trim() || "Wygenerowałem pierwszą wersję oferty.",
  };
}

export async function chatEditOfferText(
  data: OfferData,
  currentText: string,
  history: GeminiChatMessage[],
  userMessage: string,
): Promise<{ offer_text: string; reply: string }> {
  if (!isGeminiConfigured()) {
    throw new Error("Brak GEMINI_API_KEY — dodaj klucz w Netlify.");
  }

  const systemContext = `Pracujesz nad ofertą materiałów Cosgral dla klienta.
${buildClientContext(data)}

Aktualna treść oferty:
---
${currentText}
---

Zasady:
- Modyfikuj ofertę zgodnie z prośbą użytkownika
- Zachowaj strukturę sekcji i ton Cosgral
- Zwracaj CAŁĄ zaktualizowaną treść oferty (nie fragment)
- Odpowiadaj po polsku`;

  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [
    { role: "user", parts: [{ text: systemContext }] },
    {
      role: "model",
      parts: [
        {
          text: "Rozumiem. Będę edytować pełną treść oferty Cosgral zgodnie z Twoimi wskazówkami.",
        },
      ],
    },
  ];

  for (const message of history) {
    contents.push({
      role: message.role,
      parts: [{ text: message.text }],
    });
  }

  contents.push({
    role: "user",
    parts: [
      {
        text: `${userMessage}

Zwróć JSON:
{
  "offer_text": "pełna zaktualizowana treść oferty",
  "reply": "krótka odpowiedź do użytkownika po polsku — co zmieniłeś"
}`,
      },
    ],
  });

  const raw = await callGemini(contents, true);
  const parsed = JSON.parse(raw) as { offer_text?: string; reply?: string };

  if (!parsed.offer_text?.trim()) {
    throw new Error("Gemini zwróciło pustą treść oferty");
  }

  return {
    offer_text: parsed.offer_text.trim(),
    reply: parsed.reply?.trim() || "Zaktualizowałem treść oferty.",
  };
}
