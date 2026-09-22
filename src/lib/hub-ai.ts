import { createCalendarEvent } from "@/lib/calendar-store";
import { getIntranetDb } from "@/lib/intranet-db";
import { getOpsDb } from "@/lib/ops-db";
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

async function callGeminiJson(system: string, user: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Brak GEMINI_API_KEY");

  const response = await fetch(
    geminiGenerateContentUrl(apiKey),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${system}\n\n---\nWiadomość użytkownika:\n${user}` }],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini: ${errorText.slice(0, 240)}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Gemini nie zwróciło odpowiedzi");
  return text;
}

function buildSystemPrompt(ctx: {
  nowIso: string;
  clients: { id: string; company_name: string }[];
  projects: { id: string; title: string; crm_client_id: string | null }[];
}) {
  return `Jesteś asystentem Cosgral Hub. Zarządzasz CRM agencji (kalendarz, taski, klienci, zlecenia, finanse).
Teraz (ISO UTC): ${ctx.nowIso}
Strefa: Europe/Warsaw.

Odpowiedz WYŁĄCZNIE JSON:
{
  "reply": "krótka odpowiedź po polsku co zrobiłeś / czego potrzebujesz",
  "actions": [ ... ]
}

Dozwolone akcje:
1) {"type":"create_calendar_event","title":"...","starts_at":"ISO","ends_at":null,"remind_at":"ISO|null","notes":"","all_day":false}
2) {"type":"create_task","title":"...","assignee":"jakub|kacper","due_date":"YYYY-MM-DD|null","notes":"","project_id":null}
3) {"type":"create_client","company_name":"...","contact_name":"","email":"","phone":"","industry":"","notes":""}
4) {"type":"create_project","title":"...","crm_client_id":"<uuid>","service_type":"strona_www|system_crm|automatyzacja_ecommerce|grafika|montaz_wideo|kampania_meta|kampania_google|inne","assigned_to":"jakub|kacper|null","deadline":"YYYY-MM-DD|null","description":"","value_pln":null}

Zasady:
- Daty względne (piątek, jutro) licz od teraz (Warsaw).
- Jeśli user chce przypomnienie dzień przed — ustaw remind_at na dzień wcześniej ~10:00 lokalnie jako ISO.
- Assignee domyślnie "jakub".
- create_project wymaga istniejącego crm_client_id z listy poniżej — jeśli nie znasz, najpierw create_client albo poproś w reply (actions=[]).
- Nie wymyślaj UUID.

Klienci:
${ctx.clients.map((c) => `- ${c.company_name} → ${c.id}`).join("\n") || "(brak)"}

Zlecenia:
${ctx.projects.map((p) => `- ${p.title} (${p.id}) client=${p.crm_client_id}`).join("\n") || "(brak)"}`;
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
      text.match(/(?:deadline|termin|oddania|projektu|strony)\s+(.+?)(?:\s+na\s+|\s+do\s+|$)/i) ||
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

export async function planHubActions(
  message: string,
  history: { role: "user" | "assistant"; content: string }[] = [],
): Promise<HubAiPlan & { provider: "gemini" | "heuristic" }> {
  const db = getIntranetDb();
  const [clients, projects] = await Promise.all([
    db.getCrmClients().catch(() => []),
    db.getProjects().catch(() => []),
  ]);

  const ctx = {
    nowIso: new Date().toISOString(),
    clients: clients.map((c) => ({ id: c.id, company_name: c.company_name })),
    projects: projects.map((p) => ({
      id: p.id,
      title: p.title,
      crm_client_id: p.crm_client_id,
    })),
  };

  if (isGeminiConfigured()) {
    try {
      const hist = history
        .slice(-6)
        .map((h) => `${h.role}: ${h.content}`)
        .join("\n");
      const raw = await callGeminiJson(
        buildSystemPrompt(ctx),
        hist ? `${hist}\nuser: ${message}` : message,
      );
      const parsed = JSON.parse(raw) as HubAiPlan;
      if (!parsed.reply || !Array.isArray(parsed.actions)) {
        throw new Error("Zły JSON");
      }
      return { ...parsed, provider: "gemini" };
    } catch (err) {
      const local = heuristicPlan(message);
      if (local) return { ...local, provider: "heuristic" };
      return {
        reply: `Gemini chwilowo niedostępne (${err instanceof Error ? err.message.slice(0, 120) : "błąd"}). Spróbuj ponownie.`,
        actions: [],
        provider: "heuristic",
      };
    }
  }

  const local = heuristicPlan(message);
  if (local) return { ...local, provider: "heuristic" };

  return {
    reply:
      "Brak GEMINI_API_KEY — dodaj klucz Gemini (jak na Netlify), żeby AI działało w pełni. Na razie rozumiem proste komendy: kalendarz / task / klient.",
    actions: [],
    provider: "heuristic",
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
