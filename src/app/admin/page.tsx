import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PageHeader, StatusPill } from "@/components/ui/CrmUi";
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

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Cosgral Hub"
        title="Home"
        description="Skróty: zlecenia, taski, kalendarz, czaty."
      />

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
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.06]"
          >
            <p className="label-mono mb-2">{card.label}</p>
            <p className="text-sm text-white/55">{card.meta}</p>
          </Link>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="label-mono">Otwarte zlecenia</p>
          <Link href="/admin/zlecenia" className="text-xs text-white/40 underline">
            Wszystkie
          </Link>
        </div>
        {!openProjects.length ? (
          <p className="text-sm text-white/40">Brak otwartych zleceń.</p>
        ) : (
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {openProjects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/zlecenia/${p.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:bg-white/[0.03]"
                >
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-white/40">
                      {p.crm_clients?.company_name ?? "—"} ·{" "}
                      {SERVICE_TYPE_LABELS[p.service_type]} ·{" "}
                      {teamLabel(p.assigned_to)}
                    </p>
                  </div>
                  <StatusPill>{PROJECT_STATUS_LABELS[p.status]}</StatusPill>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="label-mono">Taski na dziś</p>
          <Link href="/admin/tasks" className="text-xs text-white/40 underline">
            Tasks
          </Link>
        </div>
        {!tasksToday.length ? (
          <p className="text-sm text-white/40">Nic na dziś.</p>
        ) : (
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {tasksToday.map((t) => (
              <li key={t.id} className="py-3">
                <p className="font-medium">{t.title}</p>
                <p className="text-xs text-white/40">
                  {teamLabel(t.assignee)}
                  {t.due_date ? ` · ${t.due_date}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="label-mono">Najbliższe eventy</p>
          <Link href="/admin/kalendarz" className="text-xs text-white/40 underline">
            Kalendarz
          </Link>
        </div>
        {!upcomingEvents.length ? (
          <p className="text-sm text-white/40">Kalendarz pusty.</p>
        ) : (
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {upcomingEvents.map((e) => (
              <li key={e.id} className="py-3">
                <p className="font-medium">{e.title}</p>
                <p className="text-xs text-white/40">
                  {new Date(e.starts_at).toLocaleString("pl-PL")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {leads.length > 0 ? (
        <section id="leads">
          <p className="label-mono mb-3">Inbox leadów</p>
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {leads.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-medium">{l.company_name}</p>
                  <p className="text-xs text-white/40">
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
