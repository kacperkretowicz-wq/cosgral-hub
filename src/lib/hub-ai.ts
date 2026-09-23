import { createCalendarEvent } from "@/lib/calendar-store";
import { getIntranetDb } from "@/lib/intranet-db";
import { notifyTeam } from "@/lib/notify";
import { getOpsDb } from "@/lib/ops-db";
import { teamLabel } from "@/lib/team";
import {
  geminiGenerateContentUrl,
  isGeminiConfigured,
} from "@/lib/gemini-offer";
import { isTeamMemberId } from "@/lib/team";

export type HubAiAction =
  | {
      type: "create_calendar_event";
      title: string;
      starts_at: string;
      ends_at?: string | null;
      remind_at?: string | null;
      notes?: string;
      all_day?: boolean;
    }
  | {
      type: "create_task";
      title: string;
      assignee?: string;
      due_date?: string | null;
      notes?: string;
      project_id?: string | null;
    }
  | {
      type: "create_client";
      company_name: string;
      contact_name?: string;
      email?: string;
      phone?: string;
      industry?: string;
      notes?: string;
    }
  | {
      type: "create_project";
      title: string;
      crm_client_id: string;
      service_type?:
        | "strona_www"
        | "system_crm"
        | "automatyzacja_ecommerce"
        | "grafika"
        | "montaz_wideo"
        | "kampania_meta"
        | "kampania_google"
        | "inne";
      assigned_to?: string | null;
      deadline?: string | null;
      description?: string;
      value_pln?: number | null;
    };

export type HubAiPlan = {
  reply: string;
  actions: HubAiAction[];
};

export type HubAiChatResult = HubAiPlan & {
  results: { type: string; ok: boolean; detail: string }[];
  provider: "gemini" | "heuristic";
};

type ChatTurn = { role: "user" | "assistant"; content: string };

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args?: Record<string, unknown> } }
  | {
      functionResponse: {
        name: string;
        response: Record<string, unknown>;
      };
    };

type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

const SERVICE_TYPES = [
  "strona_www",
  "system_crm",
  "automatyzacja_ecommerce",
  "grafika",
  "montaz_wideo",
  "kampania_meta",
  "kampania_google",
  "inne",
] as const;

const HUB_FUNCTION_DECLARATIONS = [
  {
    name: "create_calendar_event",
    description:
      "Dodaje wydarzenie do kalendarza zespołu Cosgral (terminy, deadline’y, spotkania).",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Tytuł wydarzenia" },
        starts_at: {
          type: "string",
          description: "Start w ISO 8601 (UTC lub z offsetem)",
        },
        ends_at: {
          type: "string",
          description: "Koniec w ISO 8601 (opcjonalnie)",
          nullable: true,
        },
        remind_at: {
          type: "string",
          description: "Przypomnienie push/mail w ISO 8601 (opcjonalnie)",
          nullable: true,
        },
        notes: { type: "string", description: "Notatki" },
        all_day: { type: "boolean", description: "Czy cały dzień" },
      },
      required: ["title", "starts_at"],
    },
  },
  {
    name: "create_task",
    description: "Tworzy task w Hubie dla Jakuba lub Kacpra.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        assignee: {
          type: "string",
          description: "jakub lub kacper",
          enum: ["jakub", "kacper"],
        },
        due_date: {
          type: "string",
          description: "Termin YYYY-MM-DD",
          nullable: true,
        },
        notes: { type: "string" },
        project_id: {
          type: "string",
          description: "UUID zlecenia (opcjonalnie)",
          nullable: true,
        },
      },
      required: ["title"],
    },
  },
  {
    name: "create_client",
    description: "Dodaje klienta CRM do Supabase.",
    parameters: {
      type: "object",
      properties: {
        company_name: { type: "string" },
        contact_name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        industry: { type: "string" },
        notes: { type: "string" },
      },
      required: ["company_name"],
    },
  },
  {
    name: "create_project",
    description:
      "Tworzy zlecenie powiązane z istniejącym klientem (wymaga crm_client_id z listy).",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        crm_client_id: {
          type: "string",
          description: "UUID klienta z listy w kontekście",
        },
        service_type: {
          type: "string",
          enum: [...SERVICE_TYPES],
        },
        assigned_to: {
          type: "string",
          enum: ["jakub", "kacper"],
          nullable: true,
        },
        deadline: {
          type: "string",
          description: "YYYY-MM-DD",
          nullable: true,
        },
        description: { type: "string" },
        value_pln: { type: "number", nullable: true },
      },
      required: ["title", "crm_client_id"],
    },
  },
];

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function atLocalHour(day: Date, hour: number, minute = 0) {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** Next Friday from reference (or today if Friday and after noon → next). */
function nextFriday(from = new Date()) {
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay(); // 0 Sun … 5 Fri
  let add = (5 - day + 7) % 7;
  if (add === 0 && from.getDay() === 5 && from.getHours() >= 18) add = 7;
  if (add === 0 && from.getDay() !== 5) add = 7;
  d.setDate(d.getDate() + (add === 0 ? 0 : add));
  return d;
}

function dayBefore(iso: string) {
  const d = new Date(iso);
  d.setDate(d.getDate() - 1);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

function buildSystemPrompt(ctx: {
  nowIso: string;
  clients: { id: string; company_name: string }[];
  projects: { id: string; title: string; crm_client_id: string | null }[];
}) {
  return `Jesteś Cosgral AI — głównym asystentem w hubie agencyjnym Cosgral (CRM, produkcja, marketing).

Masz dwa tryby pracy i płynnie między nimi przechodzisz:
1) NARZĘDZIA (Function Calling) — zarządzanie danymi w Supabase: kalendarz, taski, klienci, zlecenia. Używaj narzędzi TYLKO gdy użytkownik wyraźnie chce coś zapisać / dodać / utworzyć w Hubie.
2) ASYSTA TEKSTOWA — porady, burze mózgów, copy pod Meta Ads / Google Ads, analiza briefów, pomysły na kampanie, redakcja tekstów, wyjaśnienia procesów. Wtedy NIE odmawiaj i NIE wymuszaj narzędzi — odpowiedz konkretnie i pomocnie z wiedzy ogólnej oraz kontekstu rozmowy.

Zasady:
- Odpowiadaj po polsku, zwięźle i praktycznie (agencja).
- Nie odmawiaj z powodu „to nie jest funkcja Huba” — jesteś pełnoprawnym asystentem.
- Daty względne (piątek, jutro) licz od teraz (Europe/Warsaw). Przypomnienie „dzień wcześniej” → remind_at ~10:00 lokalnie jako ISO.
- Assignee / assigned_to domyślnie "jakub", chyba że wskazano Kacpra.
- create_project wymaga prawdziwego crm_client_id z listy poniżej — nie wymyślaj UUID. Jeśli brakuje klienta, najpierw create_client albo zapytaj.
- Możesz połączyć kilka narzędzi w jednej turze, potem podsumuj wynik użytkownikowi.
- Odnosisz się do wcześniejszych wiadomości w tej rozmowie (np. brief projektu przy pisaniu copy).

Teraz (ISO UTC): ${ctx.nowIso}
Strefa: Europe/Warsaw.

Klienci w bazie:
${ctx.clients.map((c) => `- ${c.company_name} → ${c.id}`).join("\n") || "(brak)"}

Zlecenia w bazie:
${ctx.projects.map((p) => `- ${p.title} (${p.id}) client=${p.crm_client_id}`).join("\n") || "(brak)"}`;
}

function historyToContents(
  history: ChatTurn[],
  message: string,
): GeminiContent[] {
  const contents: GeminiContent[] = [];
  const prior = history
    .filter((h) => h.content.trim())
    .slice(-16);

  for (const turn of prior) {
    // Skip duplicate of the current user message if UI included it
    if (
      turn.role === "user" &&
      turn.content.trim() === message.trim() &&
      turn === prior[prior.length - 1]
    ) {
      continue;
    }
    contents.push({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content }],
    });
  }

  contents.push({ role: "user", parts: [{ text: message }] });

  // Gemini requires first content role to be user — drop leading model turns
  while (contents.length && contents[0].role !== "user") {
    contents.shift();
  }

  return contents;
}

function extractText(parts: GeminiPart[] | undefined): string {
  if (!parts?.length) return "";
  return parts
    .map((p) => ("text" in p && typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();
}

function extractFunctionCalls(
  parts: GeminiPart[] | undefined,
): Array<{ name: string; args: Record<string, unknown> }> {
  if (!parts?.length) return [];
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  for (const part of parts) {
    if ("functionCall" in part && part.functionCall?.name) {
      calls.push({
        name: part.functionCall.name,
        args: (part.functionCall.args ?? {}) as Record<string, unknown>,
      });
    }
  }
  return calls;
}

function actionFromFunctionCall(
  name: string,
  args: Record<string, unknown>,
): HubAiAction | null {
  const str = (key: string) =>
    typeof args[key] === "string" ? (args[key] as string) : undefined;
  const strOrNull = (key: string) => {
    const v = args[key];
    if (v === null || v === undefined || v === "") return null;
    return typeof v === "string" ? v : null;
  };
  const numOrNull = (key: string) => {
    const v = args[key];
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  switch (name) {
    case "create_calendar_event": {
      const title = str("title");
      const starts_at = str("starts_at");
      if (!title || !starts_at) return null;
      return {
        type: "create_calendar_event",
        title,
        starts_at,
        ends_at: strOrNull("ends_at"),
        remind_at: strOrNull("remind_at"),
        notes: str("notes") ?? "",
        all_day: Boolean(args.all_day),
      };
    }
    case "create_task": {
      const title = str("title");
      if (!title) return null;
      return {
        type: "create_task",
        title,
        assignee: str("assignee") ?? "jakub",
        due_date: strOrNull("due_date"),
        notes: str("notes") ?? "",
        project_id: strOrNull("project_id"),
      };
    }
    case "create_client": {
      const company_name = str("company_name");
      if (!company_name) return null;
      return {
        type: "create_client",
        company_name,
        contact_name: str("contact_name"),
        email: str("email"),
        phone: str("phone"),
        industry: str("industry"),
        notes: str("notes"),
      };
    }
    case "create_project": {
      const title = str("title");
      const crm_client_id = str("crm_client_id");
      if (!title || !crm_client_id) return null;
      const service = str("service_type");
      return {
        type: "create_project",
        title,
        crm_client_id,
        service_type: SERVICE_TYPES.includes(
          service as (typeof SERVICE_TYPES)[number],
        )
          ? (service as (typeof SERVICE_TYPES)[number])
          : "strona_www",
        assigned_to: strOrNull("assigned_to"),
        deadline: strOrNull("deadline"),
        description: str("description") ?? "",
        value_pln: numOrNull("value_pln"),
      };
    }
    default:
      return null;
  }
}

async function callGeminiWithTools(
  system: string,
  contents: GeminiContent[],
): Promise<{ parts: GeminiPart[]; raw: unknown }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Brak GEMINI_API_KEY");

  const response = await fetch(geminiGenerateContentUrl(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: system }],
      },
      contents,
      tools: [{ functionDeclarations: HUB_FUNCTION_DECLARATIONS }],
      toolConfig: {
        functionCallingConfig: {
          mode: "AUTO",
        },
      },
      generationConfig: {
        temperature: 0.65,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const quotaExceeded =
      response.status === 429 || errorText.includes('"code": 429');
    if (quotaExceeded) throw new Error("QUOTA_EXCEEDED");
    throw new Error(`Gemini: ${errorText.slice(0, 240)}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  };
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  if (!parts.length) throw new Error("Gemini nie zwróciło odpowiedzi");
  return { parts, raw: payload };
}

/** Lightweight local parser when no Gemini key. */
export function heuristicPlan(message: string): HubAiPlan | null {
  const text = message.trim();
  const lower = text.toLowerCase();

  if (
    /(kalendarz|deadline|termin|wydarzenie|spotkanie|przypomn)/i.test(lower) &&
    /(zapisz|dodaj|ustaw|stwórz|stworz)/i.test(lower)
  ) {
    const friday = nextFriday();
    const starts = atLocalHour(friday, 17, 0);
    const titleMatch =
      text.match(
        /(?:deadline|termin|oddania|projektu|strony)\s+(.+?)(?:\s+na\s+|\s+do\s+|$)/i,
      ) ||
      text.match(/zapisz(?:\s+w\s+kalendarzu)?\s+(.+?)(?:\s+na\s+|\s+do\s+|$)/i);
    let title = titleMatch?.[1]?.trim() || text;
    title = title.replace(/\s+na\s+(piątek|piatek|jutro|dziś|dzis).*$/i, "").trim();
    if (title.length < 4) title = "Deadline projektu";
    if (/stron/i.test(lower) && !/stron/i.test(title)) {
      title = `Deadline oddania projektu strony`;
    }

    const remind = dayBefore(starts);
    return {
      reply: `Dodałem wydarzenie „${title}” na ${isoDay(friday)} 17:00 z przypomnieniem dzień wcześniej.`,
      actions: [
        {
          type: "create_calendar_event",
          title,
          starts_at: starts,
          ends_at: atLocalHour(friday, 18, 0),
          remind_at: remind,
          notes: "Utworzone przez Cosgral AI",
          all_day: false,
        },
      ],
    };
  }

  if (/(task|zadanie)/i.test(lower) && /(dodaj|stwórz|stworz|zapisz)/i.test(lower)) {
    let title = text
      .replace(/.*(dodaj|stwórz|stworz|zapisz)\s+(task|zadanie)\s*/i, "")
      .trim();
    if (!title) title = text;
    const assignee = /kacper/i.test(lower) ? "kacper" : "jakub";
    return {
      reply: `Dodałem task „${title}” dla ${assignee}.`,
      actions: [
        {
          type: "create_task",
          title,
          assignee,
          due_date: null,
          notes: "",
          project_id: null,
        },
      ],
    };
  }

  if (/(klient)/i.test(lower) && /(dodaj|stwórz|stworz)/i.test(lower)) {
    const m = text.match(/(?:klienta?|firmę|firme)\s+(.+)$/i);
    const company = (m?.[1] || text).replace(/^(dodaj|stwórz|stworz)\s+/i, "").trim();
    if (company.length < 2) return null;
    return {
      reply: `Dodałem klienta „${company}”.`,
      actions: [{ type: "create_client", company_name: company }],
    };
  }

  return null;
}

async function loadHubContext() {
  const db = getIntranetDb();
  const [clients, projects] = await Promise.all([
    db.getCrmClients().catch(() => []),
    db.getProjects().catch(() => []),
  ]);
  return {
    nowIso: new Date().toISOString(),
    clients: clients.map((c) => ({ id: c.id, company_name: c.company_name })),
    projects: projects.map((p) => ({
      id: p.id,
      title: p.title,
      crm_client_id: p.crm_client_id,
    })),
  };
}

/**
 * Hybrid Cosgral AI: Gemini decides AUTO between text reply and tools.
 * Tool results are fed back for a final natural-language answer.
 */
export async function runHubAiChat(
  message: string,
  history: ChatTurn[] = [],
): Promise<HubAiChatResult> {
  const ctx = await loadHubContext();

  if (!isGeminiConfigured()) {
    const local = heuristicPlan(message);
    if (local) {
      const results = await executeHubActions(local.actions);
      return { ...local, results, provider: "heuristic" };
    }
    return {
      reply:
        "Brak GEMINI_API_KEY — dodaj klucz Gemini (jak na Netlify), żeby AI działało w pełni. Na razie rozumiem proste komendy: kalendarz / task / klient. Bez klucza nie mogę pisać copy ani doradzać.",
      actions: [],
      results: [],
      provider: "heuristic",
    };
  }

  const system = buildSystemPrompt(ctx);
  const contents = historyToContents(history, message);
  const collectedActions: HubAiAction[] = [];
  const collectedResults: { type: string; ok: boolean; detail: string }[] = [];

  try {
    for (let round = 0; round < 5; round++) {
      const { parts } = await callGeminiWithTools(system, contents);
      const calls = extractFunctionCalls(parts);
      const text = extractText(parts);

      if (!calls.length) {
        return {
          reply:
            text ||
            (collectedResults.length
              ? collectedResults.map((r) => r.detail).join("\n")
              : "OK."),
          actions: collectedActions,
          results: collectedResults,
          provider: "gemini",
        };
      }

      // Model requested tools — execute, then continue the conversation
      contents.push({ role: "model", parts });

      const responseParts: GeminiPart[] = [];
      for (const call of calls) {
        const action = actionFromFunctionCall(call.name, call.args);
        if (!action) {
          responseParts.push({
            functionResponse: {
              name: call.name,
              response: {
                ok: false,
                error: "Niepełne lub nieznane argumenty funkcji",
              },
            },
          });
          continue;
        }
        collectedActions.push(action);
        const [result] = await executeHubActions([action]);
        collectedResults.push(result);
        responseParts.push({
          functionResponse: {
            name: call.name,
            response: {
              ok: result.ok,
              detail: result.detail,
            },
          },
        });
      }

      contents.push({ role: "user", parts: responseParts });
    }

    return {
      reply:
        collectedResults.length > 0
          ? `Wykonałem akcje:\n${collectedResults.map((r) => `• ${r.detail}`).join("\n")}`
          : "Przekroczono limit tur narzędzi — spróbuj uprościć prośbę.",
      actions: collectedActions,
      results: collectedResults,
      provider: "gemini",
    };
  } catch (err) {
    const local = heuristicPlan(message);
    if (local) {
      const results = await executeHubActions(local.actions);
      return { ...local, results, provider: "heuristic" };
    }
    const msg =
      err instanceof Error && err.message === "QUOTA_EXCEEDED"
        ? "Limit API Gemini wyczerpany. Doładuj billing w Google AI Studio albo spróbuj później."
        : `Gemini chwilowo niedostępne (${err instanceof Error ? err.message.slice(0, 120) : "błąd"}). Spróbuj ponownie.`;
    return {
      reply: msg,
      actions: [],
      results: [],
      provider: "heuristic",
    };
  }
}

/** @deprecated Prefer runHubAiChat — executes tools internally. */
export async function planHubActions(
  message: string,
  history: ChatTurn[] = [],
): Promise<HubAiPlan & { provider: "gemini" | "heuristic" }> {
  const result = await runHubAiChat(message, history);
  return {
    reply: result.reply,
    actions: result.actions,
    provider: result.provider,
  };
}

export async function executeHubActions(actions: HubAiAction[]) {
  const results: { type: string; ok: boolean; detail: string }[] = [];
  const intranet = getIntranetDb();
  const ops = getOpsDb();

  for (const action of actions) {
    try {
      switch (action.type) {
        case "create_calendar_event": {
          const ev = await createCalendarEvent({
            title: action.title,
            starts_at: action.starts_at,
            ends_at: action.ends_at ?? null,
            all_day: action.all_day ?? false,
            attendees: [],
            notes: action.notes ?? "",
            remind_at: action.remind_at ?? null,
          });
          await notifyTeam({
            title: "📅 Cosgral AI — nowe wydarzenie",
            body: `${ev.title}\n${new Date(ev.starts_at).toLocaleString("pl-PL")}`,
            href: "/admin/kalendarz",
          });
          results.push({
            type: action.type,
            ok: true,
            detail: `Kalendarz: ${ev.title} (${ev.id})`,
          });
          break;
        }
        case "create_task": {
          const assignee = isTeamMemberId(action.assignee ?? "")
            ? action.assignee!
            : "jakub";
          const task = await ops.createTask({
            title: action.title,
            project_id: action.project_id ?? null,
            assignee,
            status: "todo",
            due_date: action.due_date ?? null,
            notes: action.notes ?? "",
          });
          await notifyTeam({
            title: "✅ Cosgral AI — nowy task",
            body: `${task.title}\nDla: ${teamLabel(task.assignee)}${
              task.due_date ? `\nTermin: ${task.due_date}` : ""
            }`,
            href: "/admin/tasks",
          });
          results.push({
            type: action.type,
            ok: true,
            detail: `Task: ${task.title} (${task.id})`,
          });
          break;
        }
        case "create_client": {
          const client = await intranet.createCrmClient({
            company_name: action.company_name,
            contact_name: action.contact_name ?? null,
            email: action.email || null,
            phone: action.phone ?? null,
            industry: action.industry ?? null,
            notes: action.notes ?? "",
            tags: [],
          });
          await notifyTeam({
            title: "👤 Cosgral AI — nowy klient",
            body: client.company_name,
            href: `/admin/klienci/${client.id}`,
          });
          results.push({
            type: action.type,
            ok: true,
            detail: `Klient: ${client.company_name} (${client.id})`,
          });
          break;
        }
        case "create_project": {
          const project = await intranet.createProject({
            title: action.title,
            crm_client_id: action.crm_client_id,
            website_client_id: null,
            service_type: action.service_type ?? "strona_www",
            status: "nowe",
            assigned_to: action.assigned_to ?? null,
            deadline: action.deadline ?? null,
            description: action.description ?? "",
            value_pln: action.value_pln ?? null,
            cost_pln: null,
            billing_status: "wycena",
            paid_at: null,
          });
          await notifyTeam({
            title: "📋 Cosgral AI — nowe zlecenie",
            body: project.title,
            href: `/admin/zlecenia/${project.id}`,
          });
          results.push({
            type: action.type,
            ok: true,
            detail: `Zlecenie: ${project.title} (${project.id})`,
          });
          break;
        }
        default:
          results.push({
            type: "unknown",
            ok: false,
            detail: "Nieznana akcja",
          });
      }
    } catch (err) {
      results.push({
        type: (action as HubAiAction).type,
        ok: false,
        detail: err instanceof Error ? err.message : "Błąd",
      });
    }
  }

  return results;
}
