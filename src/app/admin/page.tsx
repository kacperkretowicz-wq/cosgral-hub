import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/CrmUi";
import { DbStatusBanner } from "@/components/DbStatusBanner";
import { DigitalField } from "@/components/DigitalField";
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

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Cosgral Hub"
        title="Home"
        description="Skróty: zlecenia, taski, kalendarz, czaty."
      />

      <section className="space-y-4 py-1 md:py-4">
        <h2 className="cosgral-wordmark text-[clamp(1.8rem,7vw,5.2rem)]">
          COSGRAL
        </h2>
        <p className="max-w-lg text-[0.62rem] uppercase leading-relaxed tracking-[0.22em] text-white/45 sm:text-[0.7rem] sm:tracking-[0.28em]">
          Projektujemy i wdrażamy produkty cyfrowe dla firm
        </p>
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/admin/zlecenia", label: "Zlecenia", meta: `${openProjects.length} otwarte` },
          { href: "/admin/tasks", label: "Tasks", meta: `${tasksToday.length} na dziś` },
          { href: "/admin/czat", label: "Czat strony", meta: unreadSite ? `${unreadSite} wątków` : "OK" },
          { href: "/admin/team", label: "Team", meta: recentTeam ? `${recentTeam} / 24h` : "Cicho" },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="surface group p-4 transition duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-white/25 sm:p-5"
          >
            <p className="label-mono mb-3">{card.label}</p>
            <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              {card.meta}
            </p>
          </Link>
        ))}
      </div>

      {(statusChart.length > 0 || taskChart.length > 0 || serviceChart.length > 0) && (
        <div className="grid gap-3 lg:grid-cols-3">
          {statusChart.length ? (
            <section className="surface p-5">
              <p className="label-mono mb-4">Status zleceń</p>
              <DonutChart items={statusChart} />
            </section>
          ) : null}
          {taskChart.length ? (
            <section className="surface p-5">
              <p className="label-mono mb-4">Taski</p>
              <DonutChart items={taskChart} />
            </section>
          ) : null}
          {serviceChart.length ? (
            <section className="surface p-5">
              <p className="label-mono mb-4">Usługi</p>
              <BarChart items={serviceChart} />
            </section>
          ) : null}
        </div>
      )}

      <DbStatusBanner />

      <div className="hidden gap-3 md:grid md:grid-cols-3">
        {(
          [
            { variant: "www" as const, label: "Strony internetowe" },
            { variant: "apps" as const, label: "Aplikacje" },
            { variant: "crm" as const, label: "Systemy CRM" },
          ]
        ).map((item) => (
          <div key={item.label} className="surface overflow-hidden p-0">
            <DigitalField
              variant={item.variant}
              className="h-24 rounded-none"
              veil={30}
            />
            <div className="p-3">
              <p className="label-mono">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="surface p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="label-mono">Otwarte zlecenia</p>
          <Link href="/admin/zlecenia" className="text-xs text-[var(--accent)] underline-offset-2 hover:underline">
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

      <section className="surface p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="label-mono">Taski na dziś</p>
          <Link href="/admin/tasks" className="text-xs text-[var(--accent)] underline-offset-2 hover:underline">
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

      <section className="surface p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="label-mono">Najbliższe eventy</p>
          <Link href="/admin/kalendarz" className="text-xs text-[var(--accent)] underline-offset-2 hover:underline">
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

      {leads.length > 0 ? (
        <section id="leads" className="surface p-5 md:p-6">
          <p className="label-mono mb-4">Inbox leadów</p>
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
