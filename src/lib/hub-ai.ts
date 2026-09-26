import {
  createCalendarEvent,
  listCalendarEvents,
} from "@/lib/calendar-store";
import { getIntranetDb } from "@/lib/intranet-db";
import {
  isEmailConfigured,
  notifyTeam,
  sendOutboundEmail,
} from "@/lib/notify";
import { getOpsDb } from "@/lib/ops-db";
import { TEAM, teamLabel, isTeamMemberId } from "@/lib/team";
import {
  geminiGenerateContentUrl,
  isGeminiConfigured,
} from "@/lib/gemini-offer";
import type { CalendarEvent, CrmClient, Lead, Project, Task } from "@/lib/types";

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
    }
  | {
      type: "send_email";
      to: string;
      subject: string;
      body: string;
      reply_to?: string;
    }
  | {
      type: "update_task";
      id: string;
      status?: "todo" | "doing" | "done";
      title?: string;
      due_date?: string | null;
      notes?: string;
      assignee?: string;
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

type HubSnapshot = {
  nowIso: string;
  warsawLabel: string;
  today: string;
  emailReady: boolean;
  clients: CrmClient[];
  projects: Project[];
  tasks: Task[];
  events: CalendarEvent[];
  leads: Lead[];
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
    name: "list_tasks",
    description:
      "Odczyt tasków z bazy. Używaj gdy user pyta o taski, dziś, terminy, kto ma co zrobić.",
    parameters: {
      type: "object",
      properties: {
        scope: {
          type: "string",
          enum: ["today", "overdue", "open", "all", "done"],
          description:
            "today=termin dziś lub wcześniejszy niedokończone; overdue=po terminie; open=todo+doing; all; done",
        },
        assignee: {
          type: "string",
          enum: ["jakub", "kacper"],
          nullable: true,
        },
      },
    },
  },
  {
    name: "list_calendar",
    description:
      "Odczyt wydarzeń kalendarza. Używaj przy pytaniach o terminy, spotkania, deadline’y w kalendarzu.",
    parameters: {
      type: "object",
      properties: {
        scope: {
          type: "string",
          enum: ["today", "week", "upcoming", "all"],
          description:
            "today; week=±7 dni; upcoming=od teraz w przód; all",
        },
      },
    },
  },
  {
    name: "list_clients",
    description: "Lista klientów CRM (firmy, kontakty, maile, telefony).",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Opcjonalne filtrowanie po nazwie firmy / kontakcie",
          nullable: true,
        },
      },
    },
  },
  {
    name: "list_projects",
    description: "Lista zleceń / projektów z statusem, deadline’m i klientem.",
    parameters: {
      type: "object",
      properties: {
        open_only: {
          type: "boolean",
          description: "true = bez zakończonych/anulowanych",
        },
      },
    },
  },
  {
    name: "list_leads",
    description: "Inbox leadów / zapytań.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["nowy", "kontakt", "oferta", "wygrana", "przegrana"],
          nullable: true,
        },
      },
    },
  },
  {
    name: "hub_overview",
    description:
      "Szybkie podsumowanie Huba: godzina, taski na dziś, najbliższe eventy, otwarte zlecenia, nowi leadzi. Używaj do briefów i „co dziś”.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "create_calendar_event",
    description: "Dodaje wydarzenie do kalendarza zespołu.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        starts_at: { type: "string", description: "ISO 8601" },
        ends_at: { type: "string", nullable: true },
        remind_at: { type: "string", nullable: true },
        notes: { type: "string" },
        all_day: { type: "boolean" },
      },
      required: ["title", "starts_at"],
    },
  },
  {
    name: "create_task",
    description: "Tworzy task w Hubie.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        assignee: { type: "string", enum: ["jakub", "kacper"] },
        due_date: { type: "string", nullable: true },
        notes: { type: "string" },
        project_id: { type: "string", nullable: true },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description: "Aktualizuje istniejący task (status, tytuł, termin…). Podaj id z list_tasks.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        status: { type: "string", enum: ["todo", "doing", "done"] },
        title: { type: "string" },
        due_date: { type: "string", nullable: true },
        notes: { type: "string" },
        assignee: { type: "string", enum: ["jakub", "kacper"] },
      },
      required: ["id"],
    },
  },
  {
    name: "create_client",
    description: "Dodaje klienta CRM.",
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
    description: "Tworzy zlecenie — wymaga prawdziwego crm_client_id.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        crm_client_id: { type: "string" },
        service_type: { type: "string", enum: [...SERVICE_TYPES] },
        assigned_to: {
          type: "string",
          enum: ["jakub", "kacper"],
          nullable: true,
        },
        deadline: { type: "string", nullable: true },
        description: { type: "string" },
        value_pln: { type: "number", nullable: true },
      },
      required: ["title", "crm_client_id"],
    },
  },
  {
    name: "send_email",
    description:
      "Wysyła mail z skrzynki Cosgral (kontakt@cosgral.pl / SMTP Hub). Używaj gdy user każe napisać / wysłać maila.",
    parameters: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Adres(y) docelowe, przecinek jeśli wielu",
        },
        subject: { type: "string" },
        body: { type: "string", description: "Treść wiadomości (plain text)" },
        reply_to: {
          type: "string",
          description: "Opcjonalny Reply-To",
          nullable: true,
        },
      },
      required: ["to", "subject", "body"],
    },
  },
];

function warsawToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function warsawLabel(): string {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function atLocalHour(day: Date, hour: number, minute = 0) {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function nextFriday(from = new Date()) {
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
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

function eventDay(ev: CalendarEvent) {
  return ev.starts_at.slice(0, 10);
}

function filterTasks(
  tasks: Task[],
  scope: string,
  today: string,
  assignee?: string | null,
) {
  let list = [...tasks];
  if (assignee) list = list.filter((t) => t.assignee === assignee);
  switch (scope) {
    case "today":
      return list.filter(
        (t) =>
          t.status !== "done" && (!t.due_date || t.due_date <= today),
      );
    case "overdue":
      return list.filter(
        (t) => t.status !== "done" && t.due_date && t.due_date < today,
      );
    case "open":
      return list.filter((t) => t.status !== "done");
    case "done":
      return list.filter((t) => t.status === "done");
    default:
      return list;
  }
}

function filterEvents(
  events: CalendarEvent[],
  scope: string,
  today: string,
) {
  const now = Date.now();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 1);
  const weekAhead = new Date();
  weekAhead.setDate(weekAhead.getDate() + 7);
  const from = weekAgo.toISOString();
  const to = weekAhead.toISOString();

  switch (scope) {
    case "today":
      return events.filter((e) => eventDay(e) === today);
    case "week":
      return events.filter((e) => e.starts_at >= from && e.starts_at <= to);
    case "upcoming":
      return events.filter((e) => new Date(e.starts_at).getTime() >= now - 3600000);
    default:
      return events;
  }
}

function formatTaskLine(t: Task) {
  return `- [${t.status}] ${t.title} · ${teamLabel(t.assignee)} · termin ${t.due_date ?? "brak"} · id=${t.id}`;
}

function formatEventLine(e: CalendarEvent) {
  const when = new Date(e.starts_at).toLocaleString("pl-PL", {
    timeZone: "Europe/Warsaw",
  });
  return `- ${when}: ${e.title}${e.notes ? ` (${e.notes.slice(0, 60)})` : ""} · id=${e.id}`;
}

function buildSystemPrompt(ctx: HubSnapshot) {
  const todayTasks = filterTasks(ctx.tasks, "today", ctx.today);
  const openTasks = filterTasks(ctx.tasks, "open", ctx.today).slice(0, 25);
  const weekEvents = filterEvents(ctx.events, "week", ctx.today).slice(0, 20);
  const openProjects = ctx.projects
    .filter((p) => p.status !== "zakonczone" && p.status !== "anulowane")
    .slice(0, 20);
  const newLeads = ctx.leads
    .filter((l) => l.status === "nowy")
    .slice(0, 10);

  return `Jesteś Cosgral AI — głównym asystentem w hubie agencyjnym Cosgral.
Zespół: ${TEAM.map((m) => `${m.label} (${m.id}, ${m.email})`).join(", ")}.
Mail wychodzący Cosgral: kontakt@cosgral.pl (SMTP Hub) — ${ctx.emailReady ? "SKONFIGUROWANY, możesz wysyłać send_email" : "NIE skonfigurowany — powiedz userowi jeśli chce wysłać maila"}.
Skrzynka odbiorcza nie jest podpięta IMAP — nie czytasz inboxu, ale znasz dane Huba i możesz wysyłać maile.

AKTUALNY CZAS (Europe/Warsaw): ${ctx.warsawLabel}
Dzisiejsza data (Warsaw): ${ctx.today}
UTC now: ${ctx.nowIso}

Masz pełny dostęp do bazy Huba przez narzędzia ODCZYTU i ZAPISU (Function Calling, mode AUTO).
Gdy user pyta o stan Huba (taski, klienci, eventy, zlecenia, leady, „co dziś”, podsumowanie) — ZAWSZE użyj narzędzi odczytu (list_* / hub_overview) albo oparć odpowiedź na SNAPSHOCIE poniżej. NIGDY nie mów „nie wiem / nie mam dostępu”, jeśli dane są w snapshocie lub możesz je pobrać narzędziem.

Tryby:
1) ODCZYT / ZAPIS Huba — narzędzia list_*, hub_overview, create_*, update_task, send_email.
2) ASYSTA TEKSTOWA — copy Meta/Google Ads, burze mózgów, analizy, redakcja. Bez odmawiania.

Zasady:
- Odpowiadaj po polsku, konkretnie.
- Daty względne licz od teraz (Warsaw).
- Assignee domyślnie jakub.
- create_project tylko z prawdziwym crm_client_id (z listy / list_clients).
- Po narzędziach podsumuj wynik naturalnym językiem.
- Historia rozmowy jest w contents — odnos się do wcześniejszych ustaleń.

=== SNAPSHOT BAZY (live) ===
Taski na dziś / zaległe (niedokończone z terminem ≤ dziś):
${todayTasks.map(formatTaskLine).join("\n") || "(brak)"}

Otwarte taski (max 25):
${openTasks.map(formatTaskLine).join("\n") || "(brak)"}

Kalendarz ±7 dni:
${weekEvents.map(formatEventLine).join("\n") || "(brak)"}

Klienci:
${ctx.clients.map((c) => `- ${c.company_name} · ${c.contact_name ?? "—"} · ${c.email ?? "—"} · ${c.phone ?? "—"} · id=${c.id}`).join("\n") || "(brak)"}

Otwarte zlecenia:
${openProjects.map((p) => `- ${p.title} [${p.status}] · klient=${p.crm_clients?.company_name ?? p.crm_client_id ?? "—"} · deadline ${p.deadline ?? "—"} · ${teamLabel(p.assigned_to)} · id=${p.id}`).join("\n") || "(brak)"}

Nowi leadzi:
${newLeads.map((l) => `- ${l.company_name} · ${l.email ?? "—"} · ${l.phone ?? "—"} · id=${l.id}`).join("\n") || "(brak)"}`;
}

function historyToContents(
  history: ChatTurn[],
  message: string,
): GeminiContent[] {
  const contents: GeminiContent[] = [];
  const prior = history.filter((h) => h.content.trim()).slice(-16);

  for (const turn of prior) {
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

function strArg(args: Record<string, unknown>, key: string) {
  return typeof args[key] === "string" ? (args[key] as string) : undefined;
}

function strOrNull(args: Record<string, unknown>, key: string) {
  const v = args[key];
  if (v === null || v === undefined || v === "") return null;
  return typeof v === "string" ? v : null;
}

function numOrNull(args: Record<string, unknown>, key: string) {
  const v = args[key];
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function writeActionFromCall(
  name: string,
  args: Record<string, unknown>,
): HubAiAction | null {
  switch (name) {
    case "create_calendar_event": {
      const title = strArg(args, "title");
      const starts_at = strArg(args, "starts_at");
      if (!title || !starts_at) return null;
      return {
        type: "create_calendar_event",
        title,
        starts_at,
        ends_at: strOrNull(args, "ends_at"),
        remind_at: strOrNull(args, "remind_at"),
        notes: strArg(args, "notes") ?? "",
        all_day: Boolean(args.all_day),
      };
    }
    case "create_task": {
      const title = strArg(args, "title");
      if (!title) return null;
      return {
        type: "create_task",
        title,
        assignee: strArg(args, "assignee") ?? "jakub",
        due_date: strOrNull(args, "due_date"),
        notes: strArg(args, "notes") ?? "",
        project_id: strOrNull(args, "project_id"),
      };
    }
    case "update_task": {
      const id = strArg(args, "id");
      if (!id) return null;
      const status = strArg(args, "status");
      return {
        type: "update_task",
        id,
        status:
          status === "todo" || status === "doing" || status === "done"
            ? status
            : undefined,
        title: strArg(args, "title"),
        due_date: args.due_date === undefined ? undefined : strOrNull(args, "due_date"),
        notes: strArg(args, "notes"),
        assignee: strArg(args, "assignee"),
      };
    }
    case "create_client": {
      const company_name = strArg(args, "company_name");
      if (!company_name) return null;
      return {
        type: "create_client",
        company_name,
        contact_name: strArg(args, "contact_name"),
        email: strArg(args, "email"),
        phone: strArg(args, "phone"),
        industry: strArg(args, "industry"),
        notes: strArg(args, "notes"),
      };
    }
    case "create_project": {
      const title = strArg(args, "title");
      const crm_client_id = strArg(args, "crm_client_id");
      if (!title || !crm_client_id) return null;
      const service = strArg(args, "service_type");
      return {
        type: "create_project",
        title,
        crm_client_id,
        service_type: SERVICE_TYPES.includes(
          service as (typeof SERVICE_TYPES)[number],
        )
          ? (service as (typeof SERVICE_TYPES)[number])
          : "strona_www",
        assigned_to: strOrNull(args, "assigned_to"),
        deadline: strOrNull(args, "deadline"),
        description: strArg(args, "description") ?? "",
        value_pln: numOrNull(args, "value_pln"),
      };
    }
    case "send_email": {
      const to = strArg(args, "to");
      const subject = strArg(args, "subject");
      const body = strArg(args, "body");
      if (!to || !subject || !body) return null;
      return {
        type: "send_email",
        to,
        subject,
        body,
        reply_to: strArg(args, "reply_to"),
      };
    }
    default:
      return null;
  }
}

async function dispatchToolCall(
  name: string,
  args: Record<string, unknown>,
  ctx: HubSnapshot,
): Promise<{
  response: Record<string, unknown>;
  action?: HubAiAction;
  result?: { type: string; ok: boolean; detail: string };
}> {
  const today = ctx.today;

  switch (name) {
    case "list_tasks": {
      const scope = strArg(args, "scope") || "open";
      const assignee = strArg(args, "assignee");
      const list = filterTasks(ctx.tasks, scope, today, assignee).slice(0, 50);
      return {
        response: {
          ok: true,
          today,
          count: list.length,
          tasks: list.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            assignee: t.assignee,
            assignee_label: teamLabel(t.assignee),
            due_date: t.due_date,
            notes: t.notes,
            project_id: t.project_id,
          })),
        },
      };
    }
    case "list_calendar": {
      const scope = strArg(args, "scope") || "upcoming";
      // Refresh events for accuracy
      const fresh = await listCalendarEvents().catch(() => ctx.events);
      const list = filterEvents(fresh, scope, today).slice(0, 40);
      return {
        response: {
          ok: true,
          today,
          count: list.length,
          events: list.map((e) => ({
            id: e.id,
            title: e.title,
            starts_at: e.starts_at,
            ends_at: e.ends_at,
            notes: e.notes,
            remind_at: e.remind_at,
            starts_pl: new Date(e.starts_at).toLocaleString("pl-PL", {
              timeZone: "Europe/Warsaw",
            }),
          })),
        },
      };
    }
    case "list_clients": {
      const q = (strArg(args, "query") || "").toLowerCase();
      const list = ctx.clients
        .filter((c) => {
          if (!q) return true;
          return (
            c.company_name.toLowerCase().includes(q) ||
            (c.contact_name ?? "").toLowerCase().includes(q) ||
            (c.email ?? "").toLowerCase().includes(q)
          );
        })
        .slice(0, 40);
      return {
        response: {
          ok: true,
          count: list.length,
          clients: list.map((c) => ({
            id: c.id,
            company_name: c.company_name,
            contact_name: c.contact_name,
            email: c.email,
            phone: c.phone,
            industry: c.industry,
            notes: c.notes,
          })),
        },
      };
    }
    case "list_projects": {
      const openOnly = args.open_only !== false;
      let list = [...ctx.projects];
      if (openOnly) {
        list = list.filter(
          (p) => p.status !== "zakonczone" && p.status !== "anulowane",
        );
      }
      list = list.slice(0, 40);
      return {
        response: {
          ok: true,
          count: list.length,
          projects: list.map((p) => ({
            id: p.id,
            title: p.title,
            status: p.status,
            service_type: p.service_type,
            crm_client_id: p.crm_client_id,
            client: p.crm_clients?.company_name ?? null,
            assigned_to: p.assigned_to,
            deadline: p.deadline,
            value_pln: p.value_pln,
            billing_status: p.billing_status,
          })),
        },
      };
    }
    case "list_leads": {
      const status = strArg(args, "status");
      let list = [...ctx.leads];
      if (status) list = list.filter((l) => l.status === status);
      list = list.slice(0, 30);
      return {
        response: {
          ok: true,
          count: list.length,
          leads: list.map((l) => ({
            id: l.id,
            company_name: l.company_name,
            contact_name: l.contact_name,
            email: l.email,
            phone: l.phone,
            status: l.status,
            source: l.source,
            message: l.message.slice(0, 200),
          })),
        },
      };
    }
    case "hub_overview": {
      const todayTasks = filterTasks(ctx.tasks, "today", today);
      const upcoming = filterEvents(ctx.events, "upcoming", today).slice(0, 8);
      const openProjects = ctx.projects.filter(
        (p) => p.status !== "zakonczone" && p.status !== "anulowane",
      );
      return {
        response: {
          ok: true,
          now_warsaw: ctx.warsawLabel,
          today,
          tasks_today: todayTasks.map((t) => ({
            title: t.title,
            assignee: teamLabel(t.assignee),
            due_date: t.due_date,
            status: t.status,
          })),
          upcoming_events: upcoming.map((e) => ({
            title: e.title,
            starts_pl: new Date(e.starts_at).toLocaleString("pl-PL", {
              timeZone: "Europe/Warsaw",
            }),
          })),
          open_projects_count: openProjects.length,
          clients_count: ctx.clients.length,
          new_leads: ctx.leads.filter((l) => l.status === "nowy").length,
          email_ready: ctx.emailReady,
        },
      };
    }
    default: {
      const action = writeActionFromCall(name, args);
      if (!action) {
        return {
          response: {
            ok: false,
            error: `Nieznane lub niepełne narzędzie: ${name}`,
          },
        };
      }
      const [result] = await executeHubActions([action]);
      return {
        response: { ok: result.ok, detail: result.detail },
        action,
        result,
      };
    }
  }
}

async function callGeminiWithTools(
  system: string,
  contents: GeminiContent[],
): Promise<{ parts: GeminiPart[] }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Brak GEMINI_API_KEY");

  const response = await fetch(geminiGenerateContentUrl(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents,
      tools: [{ functionDeclarations: HUB_FUNCTION_DECLARATIONS }],
      toolConfig: {
        functionCallingConfig: { mode: "AUTO" },
      },
      generationConfig: {
        temperature: 0.55,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 429 || errorText.includes('"code": 429')) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw new Error(`Gemini: ${errorText.slice(0, 240)}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  };
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  if (!parts.length) throw new Error("Gemini nie zwróciło odpowiedzi");
  return { parts };
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
    title = title
      .replace(/\s+na\s+(piątek|piatek|jutro|dziś|dzis).*$/i, "")
      .trim();
    if (title.length < 4) title = "Deadline projektu";
    if (/stron/i.test(lower) && !/stron/i.test(title)) {
      title = `Deadline oddania projektu strony`;
    }
    return {
      reply: `Dodałem wydarzenie „${title}” na ${isoDay(friday)} 17:00 z przypomnieniem dzień wcześniej.`,
      actions: [
        {
          type: "create_calendar_event",
          title,
          starts_at: starts,
          ends_at: atLocalHour(friday, 18, 0),
          remind_at: dayBefore(starts),
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
    const company = (m?.[1] || text)
      .replace(/^(dodaj|stwórz|stworz)\s+/i, "")
      .trim();
    if (company.length < 2) return null;
    return {
      reply: `Dodałem klienta „${company}”.`,
      actions: [{ type: "create_client", company_name: company }],
    };
  }

  return null;
}

async function loadHubContext(): Promise<HubSnapshot> {
  const intranet = getIntranetDb();
  const ops = getOpsDb();
  const [clients, projects, tasks, events, leads] = await Promise.all([
    intranet.getCrmClients().catch(() => [] as CrmClient[]),
    intranet.getProjects().catch(() => [] as Project[]),
    ops.getTasks().catch(() => [] as Task[]),
    listCalendarEvents().catch(() => [] as CalendarEvent[]),
    ops.getLeads().catch(() => [] as Lead[]),
  ]);

  return {
    nowIso: new Date().toISOString(),
    warsawLabel: warsawLabel(),
    today: warsawToday(),
    emailReady: isEmailConfigured(),
    clients,
    projects,
    tasks,
    events,
    leads,
  };
}

function answerFromSnapshot(message: string, ctx: HubSnapshot): string | null {
  const lower = message.toLowerCase();
  if (
    /(która|jaka).*(godzin|dat)|który dziś|jaki dziś dzień|który mamy/.test(
      lower,
    )
  ) {
    return `Teraz w Warszawie: ${ctx.warsawLabel}.`;
  }
  if (/task/.test(lower) && /(dziś|dzis|today|na dziś|na dzis)/.test(lower)) {
    const list = filterTasks(ctx.tasks, "today", ctx.today);
    if (!list.length) return `Na dziś (${ctx.today}) nie ma otwartych tasków z terminem ≤ dziś.`;
    return `Taski na dziś / zaległe (${ctx.today}):\n${list.map(formatTaskLine).join("\n")}`;
  }
  if (/task/.test(lower) && /(jakie|lista|pokaż|pokaz|mamy)/.test(lower)) {
    const list = filterTasks(ctx.tasks, "open", ctx.today).slice(0, 20);
    if (!list.length) return "Brak otwartych tasków.";
    return `Otwarte taski:\n${list.map(formatTaskLine).join("\n")}`;
  }
  if (
    /(kalendarz|wydarzen|event)/.test(lower) &&
    /(jakie|co|dziś|dzis|tydzień|tydzien|najbliż)/.test(lower)
  ) {
    const list = filterEvents(ctx.events, "week", ctx.today).slice(0, 15);
    if (!list.length) return "W kalendarzu (±7 dni) pusto.";
    return `Kalendarz (±7 dni):\n${list.map(formatEventLine).join("\n")}`;
  }
  if (/klient/.test(lower) && /(jakie|lista|kto|firmy|mamy)/.test(lower)) {
    if (!ctx.clients.length) return "Brak klientów w CRM.";
    return `Klienci:\n${ctx.clients.map((c) => `- ${c.company_name} (${c.email ?? "brak maila"})`).join("\n")}`;
  }
  return null;
}

/**
 * Hybrid Cosgral AI with full Hub read/write + email.
 */
export async function runHubAiChat(
  message: string,
  history: ChatTurn[] = [],
): Promise<HubAiChatResult> {
  const ctx = await loadHubContext();

  if (!isGeminiConfigured()) {
    const snap = answerFromSnapshot(message, ctx);
    if (snap) {
      return { reply: snap, actions: [], results: [], provider: "heuristic" };
    }
    const local = heuristicPlan(message);
    if (local) {
      const results = await executeHubActions(local.actions);
      return { ...local, results, provider: "heuristic" };
    }
    return {
      reply:
        "Brak GEMINI_API_KEY. Mogę lokalnie podpowiedzieć stan bazy (taski/klienci) i proste komendy dodawania.",
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
    for (let round = 0; round < 6; round++) {
      const { parts } = await callGeminiWithTools(system, contents);
      const calls = extractFunctionCalls(parts);
      const text = extractText(parts);

      if (!calls.length) {
        // Prefer model text; if empty and question looks like data ask, fall back to snapshot
        const reply =
          text ||
          answerFromSnapshot(message, ctx) ||
          (collectedResults.length
            ? collectedResults.map((r) => r.detail).join("\n")
            : "OK.");
        return {
          reply,
          actions: collectedActions,
          results: collectedResults,
          provider: "gemini",
        };
      }

      contents.push({ role: "model", parts });
      const responseParts: GeminiPart[] = [];

      for (const call of calls) {
        const dispatched = await dispatchToolCall(call.name, call.args, ctx);
        if (dispatched.action) collectedActions.push(dispatched.action);
        if (dispatched.result) collectedResults.push(dispatched.result);
        else {
          collectedResults.push({
            type: call.name,
            ok: Boolean(dispatched.response.ok),
            detail:
              typeof dispatched.response.detail === "string"
                ? dispatched.response.detail
                : `${call.name}: ${dispatched.response.count ?? "ok"}`,
          });
        }
        responseParts.push({
          functionResponse: {
            name: call.name,
            response: dispatched.response,
          },
        });
      }

      contents.push({ role: "user", parts: responseParts });
    }

    return {
      reply:
        collectedResults.length > 0
          ? `Wykonałem:\n${collectedResults.map((r) => `• ${r.detail}`).join("\n")}`
          : "Za dużo tur narzędzi — uprość prośbę.",
      actions: collectedActions,
      results: collectedResults,
      provider: "gemini",
    };
  } catch (err) {
    const snap = answerFromSnapshot(message, ctx);
    if (snap) {
      return { reply: snap, actions: [], results: [], provider: "heuristic" };
    }
    const local = heuristicPlan(message);
    if (local) {
      const results = await executeHubActions(local.actions);
      return { ...local, results, provider: "heuristic" };
    }
    const msg =
      err instanceof Error && err.message === "QUOTA_EXCEEDED"
        ? "Limit API Gemini wyczerpany. Doładuj billing w Google AI Studio albo spróbuj później."
        : `Gemini chwilowo niedostępne (${err instanceof Error ? err.message.slice(0, 120) : "błąd"}).`;
    return { reply: msg, actions: [], results: [], provider: "heuristic" };
  }
}

/** @deprecated Prefer runHubAiChat */
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
        case "update_task": {
          const patch: Partial<Task> = {};
          if (action.status) patch.status = action.status;
          if (action.title) patch.title = action.title;
          if (action.due_date !== undefined) patch.due_date = action.due_date;
          if (action.notes !== undefined) patch.notes = action.notes;
          if (action.assignee && isTeamMemberId(action.assignee)) {
            patch.assignee = action.assignee;
          }
          const task = await ops.updateTask(action.id, patch);
          results.push({
            type: action.type,
            ok: true,
            detail: `Zaktualizowano task: ${task.title} [${task.status}]`,
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
        case "send_email": {
          const sent = await sendOutboundEmail({
            to: action.to,
            subject: action.subject,
            body: action.body,
            replyTo: action.reply_to,
          });
          if (sent.ok) {
            await notifyTeam({
              title: "✉️ Cosgral AI — wysłano mail",
              body: `${action.subject}\n→ ${action.to}`,
              href: "/admin",
            });
          }
          results.push({
            type: action.type,
            ok: sent.ok,
            detail: sent.detail,
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
