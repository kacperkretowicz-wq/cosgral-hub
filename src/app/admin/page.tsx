import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DbStatusBanner } from "@/components/DbStatusBanner";
import { MonthCal } from "@/components/MonthCal";
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

export default async function AdminHome() {
  let projects: Project[] = [];
  let tasks: Task[] = [];
  let leads: Lead[] = [];
  let openProjects: Project[] = [];
  let tasksToday: Task[] = [];
  let upcomingEvents: Awaited<ReturnType<typeof listCalendarEvents>> = [];
  let allEvents: Awaited<ReturnType<typeof listCalendarEvents>> = [];
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
    allEvents = await listCalendarEvents();
    const now = Date.now();
    upcomingEvents = allEvents
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

  const now = new Date();
  const eventsByDay: Record<string, string[]> = {};
  for (const ev of allEvents) {
    const key = ev.starts_at.slice(0, 10);
    (eventsByDay[key] ??= []).push(ev.title);
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="flex flex-col items-center pb-10 pt-6 text-center md:pb-14 md:pt-8">
        <h1 className="cosgral-wordmark text-[clamp(2.4rem,9vw,5.4rem)]">
          COSGRAL
        </h1>
      </section>

      <div className="hub-bento">
        <Link
          href="/admin/zlecenia"
          className="hub-tile hub-tile-white hub-span-3 hub-row-2 flex flex-col justify-between p-5 sm:p-6"
        >
          <p className="label-mono mb-3 text-white/55 sm:mb-6">Zlecenia</p>
          <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl md:text-[1.65rem]">
            {openProjects.length} otwarte
          </p>
        </Link>

        <Link
          href="/admin/tasks"
          className="hub-tile hub-tile-blue hub-span-3 flex flex-col justify-between p-5 sm:p-6"
        >
          <p className="label-mono mb-3 text-white/55 sm:mb-6">Tasks</p>
          <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl md:text-[1.65rem]">
            {tasksToday.length} na dziś
          </p>
        </Link>

        <Link
          href="/admin/kalendarz"
          className="hub-tile hub-tile-gray hub-span-2 hub-mobile-full flex flex-col justify-between p-4 sm:p-5"
        >
          <p className="label-mono mb-3 text-white/55 sm:mb-6">Kalendarz</p>
          <div className="flex min-h-0 flex-1 flex-col justify-between gap-3">
            <MonthCal
              year={now.getFullYear()}
              month={now.getMonth()}
              eventsByDay={eventsByDay}
              compact
            />
            <p className="truncate text-sm font-semibold tracking-tight text-white sm:text-base">
              {upcomingEvents[0]?.title ?? "Pusto"}
            </p>
          </div>
        </Link>

        <Link
          href="/admin/czat"
          className="hub-tile hub-tile-silver hub-span-2 flex flex-col justify-between p-5"
        >
          <p className="label-mono mb-3 text-white/55 sm:mb-6">Czat strony</p>
          <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl md:text-[1.65rem]">
            {unreadSite ? `${unreadSite} wątków` : "OK"}
          </p>
        </Link>

        <Link
          href="/admin/team"
          className="hub-tile hub-tile-blue-deep hub-span-2 flex flex-col justify-between p-5"
        >
          <p className="label-mono mb-3 text-white/55 sm:mb-6">Team</p>
          <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl md:text-[1.65rem]">
            {recentTeam ? `${recentTeam} / 24h` : "Cicho"}
          </p>
        </Link>

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
          <section className="hub-tile hub-tile-gray hub-span-6 hub-mobile-full p-5 md:p-6">
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
          <p className="text-sm text-white/70">Brak otwartych zleceń.</p>
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
                    <p className="text-xs text-white/70">
                      {p.crm_clients?.company_name ?? "—"} ·{" "}
                      {SERVICE_TYPE_LABELS[p.service_type]} ·{" "}
                      {teamLabel(p.assigned_to)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[0.65rem] uppercase tracking-[0.14em] text-white/70">
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
            <p className="text-sm text-white/70">Nic na dziś.</p>
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
                      <p className="text-xs text-white/70">
                        {teamLabel(t.assignee)}
                        {t.due_date ? ` · ${t.due_date}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-[0.65rem] uppercase tracking-[0.14em] text-white/70">
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
            <p className="text-sm text-white/70">Kalendarz pusty.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {upcomingEvents.map((e) => (
                <li key={e.id} className="py-3.5">
                  <p className="font-medium text-white">{e.title}</p>
                  <p className="text-xs text-white/70">
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
                  <p className="text-xs text-white/70">
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
