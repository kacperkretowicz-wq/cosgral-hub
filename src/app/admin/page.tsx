import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DbStatusBanner } from "@/components/DbStatusBanner";
import { DonutChart, BarChart } from "@/components/ui/GlassChart";
import { getIntranetDb } from "@/lib/intranet-db";
import { getOpsDb } from "@/lib/ops-db";
import { listCalendarEvents } from "@/lib/calendar-store";
import { listTeamMessages } from "@/lib/team-chat-store";
import { listThreads } from "@/lib/site-chat";
import {
  PROJECT_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
} from "@/lib/intranet-labels";
import { teamLabel } from "@/lib/team";
import type { Lead, Project, Task } from "@/lib/types";

export const dynamic = "force-dynamic";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TILE_TONES = [
  "hub-tile-white",
  "hub-tile-blue",
  "hub-tile-gray",
  "hub-tile-silver",
  "hub-tile-blue-deep",
  "hub-tile-slate",
] as const;

export default async function AdminHome() {
  let projects: Project[] = [];
  let tasks: Task[] = [];
  let leads: Lead[] = [];
  let openProjects: Project[] = [];
  let tasksToday: Task[] = [];
  let upcomingEvents: Awaited<ReturnType<typeof listCalendarEvents>> = [];
  let unreadSite = 0;
  let recentTeam = 0;

  try {
    projects = await getIntranetDb().getProjects();
    openProjects = projects
      .filter((p) => p.status !== "zakonczone" && p.status !== "anulowane")
      .slice(0, 6);
  } catch {
    /* empty */
  }

  try {
    tasks = await getOpsDb().getTasks();
    const today = todayIso();
    tasksToday = tasks
      .filter((t) => t.status !== "done" && (!t.due_date || t.due_date <= today))
      .slice(0, 6);
  } catch {
    /* empty */
  }

  try {
    const events = await listCalendarEvents();
    const now = Date.now();
    upcomingEvents = events
      .filter((e) => new Date(e.starts_at).getTime() >= now - 3600000)
      .slice(0, 5);
  } catch {
    /* empty */
  }

  try {
    const threads = await listThreads();
    unreadSite = threads.length;
  } catch {
    unreadSite = 0;
  }

  try {
    const msgs = await listTeamMessages("general", 50);
    const dayAgo = Date.now() - 86400000;
    recentTeam = msgs.filter(
      (m) => new Date(m.created_at).getTime() > dayAgo,
    ).length;
  } catch {
    recentTeam = 0;
  }

  try {
    leads = (await getOpsDb().getLeads())
      .filter((l) => l.status === "nowy" && !l.crm_client_id)
      .slice(0, 5);
  } catch {
    leads = [];
  }

  const statusChart = Object.entries(PROJECT_STATUS_LABELS)
    .map(([k, label]) => ({
      label,
      value: projects.filter((p) => p.status === k).length,
    }))
    .filter((i) => i.value > 0);
  const serviceChart = Object.entries(SERVICE_TYPE_LABELS)
    .map(([k, label]) => ({
      label,
      value: projects.filter((p) => p.service_type === k).length,
    }))
    .filter((i) => i.value > 0);
  const taskChart = [
    { label: "Do zrobienia", value: tasks.filter((t) => t.status === "todo").length },
    { label: "W toku", value: tasks.filter((t) => t.status === "doing").length },
    { label: "Gotowe", value: tasks.filter((t) => t.status === "done").length },
  ].filter((i) => i.value > 0);

  const shortcuts = [
    {
      href: "/admin/zlecenia",
      label: "Zlecenia",
      meta: `${openProjects.length} otwarte`,
      tone: TILE_TONES[0],
      className: "hub-span-3 hub-row-2 p-5 sm:p-6",
    },
    {
      href: "/admin/tasks",
      label: "Tasks",
      meta: `${tasksToday.length} na dziś`,
      tone: TILE_TONES[1],
      className: "hub-span-3 p-5 sm:p-6",
    },
    {
      href: "/admin/kalendarz",
      label: "Kalendarz",
      meta: upcomingEvents[0]?.title ?? "Pusto",
      tone: TILE_TONES[2],
      className: "hub-span-2 p-5",
    },
    {
      href: "/admin/czat",
      label: "Czat strony",
      meta: unreadSite ? `${unreadSite} wątków` : "OK",
      tone: TILE_TONES[3],
      className: "hub-span-2 p-5",
    },
    {
      href: "/admin/team",
      label: "Team",
      meta: recentTeam ? `${recentTeam} / 24h` : "Cicho",
      tone: TILE_TONES[4],
      className: "hub-span-2 p-5",
    },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="space-y-5 py-1 md:py-2">
        <h1 className="cosgral-wordmark text-[clamp(2rem,8vw,5.4rem)]">
          COSGRAL
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/zlecenia">
            <Button>Otwórz zlecenia</Button>
          </Link>
          <Link href="/admin/zlecenia/nowe">
            <Button variant="secondary">+ Zlecenie</Button>
          </Link>
          <Link href="/admin/klienci/nowy">
            <Button variant="secondary">+ Klient</Button>
          </Link>
        </div>
      </section>

      <div className="hub-bento">
        {shortcuts.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`hub-tile ${card.tone} ${card.className} flex flex-col justify-between`}
          >
            <p className="label-mono mb-6 text-white/55">{card.label}</p>
            <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl md:text-[1.65rem]">
              {card.meta}
            </p>
          </Link>
        ))}

        {statusChart.length > 0 ? (
          <section className="hub-tile hub-tile-white hub-span-3 p-5 md:p-6">
            <p className="label-mono mb-4 text-white/55">Status zleceń</p>
            <DonutChart items={statusChart} />
          </section>
        ) : null}
        {taskChart.length > 0 ? (
          <section className="hub-tile hub-tile-blue hub-span-3 p-5 md:p-6">
            <p className="label-mono mb-4 text-white/55">Taski</p>
            <DonutChart items={taskChart} />
          </section>
        ) : null}
        {serviceChart.length > 0 ? (
          <section className="hub-tile hub-tile-gray hub-span-6 p-5 md:p-6">
            <p className="label-mono mb-4 text-white/55">Usługi</p>
            <BarChart items={serviceChart} />
          </section>
        ) : null}
      </div>

      <DbStatusBanner />

      <section className="hub-tile hub-tile-silver p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="label-mono text-white/55">Otwarte zlecenia</p>
          <Link
            href="/admin/zlecenia"
            className="text-xs text-white/70 underline-offset-2 hover:text-white hover:underline"
          >
            Wszystkie
          </Link>
        </div>
        {!openProjects.length ? (
          <p className="text-sm text-white/45">Brak otwartych zleceń.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {openProjects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/zlecenia/${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl py-3.5 transition hover:bg-white/[0.04]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{p.title}</p>
                    <p className="text-xs text-white/45">
                      {p.crm_clients?.company_name ?? "—"} ·{" "}
                      {SERVICE_TYPE_LABELS[p.service_type]} ·{" "}
                      {teamLabel(p.assigned_to)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[0.65rem] uppercase tracking-[0.14em] text-white/45">
                    Edytuj
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <section className="hub-tile hub-tile-blue-deep p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="label-mono text-white/55">Taski na dziś</p>
            <Link
              href="/admin/tasks"
              className="text-xs text-white/70 underline-offset-2 hover:text-white hover:underline"
            >
              Tasks
            </Link>
          </div>
          {!tasksToday.length ? (
            <p className="text-sm text-white/45">Nic na dziś.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {tasksToday.map((t) => (
                <li key={t.id}>
                  <Link
                    href="/admin/tasks"
                    className="flex items-center justify-between gap-3 py-3.5 transition hover:bg-white/[0.04]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{t.title}</p>
                      <p className="text-xs text-white/45">
                        {teamLabel(t.assignee)}
                        {t.due_date ? ` · ${t.due_date}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-[0.65rem] uppercase tracking-[0.14em] text-white/45">
                      Edytuj
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="hub-tile hub-tile-slate p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="label-mono text-white/55">Najbliższe eventy</p>
            <Link
              href="/admin/kalendarz"
              className="text-xs text-white/70 underline-offset-2 hover:text-white hover:underline"
            >
              Kalendarz
            </Link>
          </div>
          {!upcomingEvents.length ? (
            <p className="text-sm text-white/45">Kalendarz pusty.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {upcomingEvents.map((e) => (
                <li key={e.id} className="py-3.5">
                  <p className="font-medium text-white">{e.title}</p>
                  <p className="text-xs text-white/45">
                    {new Date(e.starts_at).toLocaleString("pl-PL")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {leads.length > 0 ? (
        <section className="hub-tile hub-tile-gray p-5 md:p-6">
          <p className="label-mono mb-4 text-white/55">Inbox leadów</p>
          <ul className="divide-y divide-white/10">
            {leads.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3.5"
              >
                <div>
                  <p className="font-medium text-white">{l.company_name}</p>
                  <p className="text-xs text-white/45">
                    {[l.contact_name, l.email, l.phone].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Link
                  href={`/admin/klienci/nowy?company=${encodeURIComponent(l.company_name)}&contact=${encodeURIComponent(l.contact_name ?? "")}&email=${encodeURIComponent(l.email ?? "")}&phone=${encodeURIComponent(l.phone ?? "")}`}
                >
                  <Button variant="secondary">Zrób klienta</Button>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
