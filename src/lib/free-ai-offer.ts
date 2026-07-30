import {
  buildOfferDocument,
  offerDocumentToPlainText,
  type OfferDocument,
} from "./offer-document";
import type { OfferData } from "./offer-templates";

export type FreeAiProvider = "groq" | "openrouter" | "none";

export function getFreeAiProvider(): FreeAiProvider {
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  return "none";
}

export function isFreeAiConfigured(): boolean {
  return getFreeAiProvider() !== "none";
}

async function callFreeChat(
  system: string,
  user: string,
  json = false,
): Promise<string> {
  const provider = getFreeAiProvider();
  if (provider === "none") {
    throw new Error("Brak darmowego AI (GROQ_API_KEY lub OPENROUTER_API_KEY).");
  }

  const isGroq = provider === "groq";
  const url = isGroq
    ? "https://api.groq.com/openai/v1/chat/completions"
    : "https://openrouter.ai/api/v1/chat/completions";
  const apiKey = isGroq
    ? process.env.GROQ_API_KEY!
    : process.env.OPENROUTER_API_KEY!;
  const model = isGroq
    ? "llama-3.3-70b-versatile"
    : "openrouter/free";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(isGroq
        ? {}
        : {
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://cosgralhub.netlify.app",
            "X-Title": "Cosgral Hub",
          }),
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      ...(json ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Free AI (${provider}): ${text.slice(0, 240)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Free AI nie zwróciło odpowiedzi");
  return content;
}

export async function generateOfferDocument(input: {
  companyName: string;
  industry?: string | null;
  pageType: "onepage" | "multipage";
  deadline?: string | null;
  driveFolderUrl?: string | null;
}): Promise<{ document: OfferDocument; offer_text: string; reply: string }> {
  const document = buildOfferDocument(input);
  const offer_text = offerDocumentToPlainText(document);

  if (!isFreeAiConfigured()) {
    return {
      document,
      offer_text,
      reply:
        "Złożono ofertę z szablonu Cosgral (bez AI — $0). Możesz edytować każdą sekcję ręcznie.",
    };
  }

  try {
    const raw = await callFreeChat(
      "Jesteś copywriterem agencji Cosgral. Piszesz po polsku, krótko, konkretnie. Nie wymyślasz faktów o firmie.",
      `Dostosuj 2 pola oferty do branży klienta. Zwróć JSON:
{
  "goal_intro": "2-4 zdania wstępu (jak w ofercie Cosgral)",
  "recommendation": "2-4 zdania rekomendacji kierunku wizualnego",
  "reply": "1 zdanie do użytkatora"
}

Firma: ${input.companyName}
Branża: ${input.industry || "nie podano"}
Typ: ${input.pageType}

Aktualny wstęp:
${document.goal.intro}

Aktualna rekomendacja:
${document.visual_direction.recommendation}`,
      true,
    );

    const parsed = JSON.parse(raw) as {
      goal_intro?: string;
      recommendation?: string;
      reply?: string;
    };

    const next: OfferDocument = {
      ...document,
      goal: {
        ...document.goal,
        intro: parsed.goal_intro?.trim() || document.goal.intro,
      },
      visual_direction: {
        ...document.visual_direction,
        recommendation:
          parsed.recommendation?.trim() ||
          document.visual_direction.recommendation,
      },
    };

    return {
      document: next,
      offer_text: offerDocumentToPlainText(next),
      reply:
        parsed.reply?.trim() ||
        `Dopieszczono wstęp i rekomendację przez darmowe AI (${getFreeAiProvider()}).`,
    };
  } catch {
    return {
      document,
      offer_text,
      reply:
        "Szablon Cosgral gotowy. Darmowe AI niedostępne w tej chwili — edytuj ręcznie.",
    };
  }
}

/** Keep legacy chat editor working when free AI exists; otherwise clear error */
export async function chatEditOfferPlainText(
  data: OfferData,
  currentText: string,
  userMessage: string,
): Promise<{ offer_text: string; reply: string }> {
  if (!isFreeAiConfigured()) {
    throw new Error(
      "Brak darmowego AI. Ustaw GROQ_API_KEY lub OPENROUTER_API_KEY, albo edytuj treść ręcznie.",
    );
  }

  const raw = await callFreeChat(
    "Edytujesz ofertę materiałów Cosgral. Zwracaj całą zaktualizowaną treść. Po polsku.",
    `Kontekst klienta: ${data.companyName}, branża: ${data.industry || "n/d"}, typ: ${data.pageType}

Aktualna oferta:
---
${currentText}
---

Prośba użytkownika: ${userMessage}

Zwróć JSON:
{ "offer_text": "...", "reply": "co zmieniłeś" }`,
    true,
  );

  const parsed = JSON.parse(raw) as { offer_text?: string; reply?: string };
  if (!parsed.offer_text?.trim()) {
    throw new Error("AI zwróciło pustą treść");
  }
  return {
    offer_text: parsed.offer_text.trim(),
    reply: parsed.reply?.trim() || "Zaktualizowałem treść.",
  };
}
