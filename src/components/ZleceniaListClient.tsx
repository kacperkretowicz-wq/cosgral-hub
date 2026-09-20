"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmptyState, PageHeader, StatusPill } from "@/components/ui/CrmUi";
import {
  BILLING_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
  SERVICE_TYPES,
  isBillingInProgress,
  isBillingSettled,
} from "@/lib/intranet-labels";
import { TEAM, teamLabel } from "@/lib/team";
import type { Project, ProjectStatus, ServiceType } from "@/lib/types";

export function ZleceniaListClient({ projects }: { projects: Project[] }) {
  const [status, setStatus] = useState<ProjectStatus | "">("");
  const [service, setService] = useState<ServiceType | "">("");
  const [assignee, setAssignee] = useState("");
  const [billing, setBilling] = useState<"w_toku" | "rozliczone" | "">("");
  const [clientQ, setClientQ] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (status && p.status !== status) return false;
      if (service && p.service_type !== service) return false;
      if (assignee && p.assigned_to !== assignee) return false;
      if (billing === "w_toku" && !isBillingInProgress(p.billing_status))
        return false;
      if (billing === "rozliczone" && !isBillingSettled(p.billing_status))
        return false;
      if (
        clientQ &&
        !(p.crm_clients?.company_name ?? "")
          .toLowerCase()
          .includes(clientQ.toLowerCase())
      )
        return false;
      return true;
    });
  }, [projects, status, service, assignee, billing, clientQ]);

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Zlecenia"
        description="Status, usługa, klient, rozliczenie."
        actions={
          <>
            <Button
              variant="secondary"
              type="button"
              className="md:hidden"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              Filtry
            </Button>
            <Link href="/admin/zlecenia/nowe">
              <Button>+ Nowe</Button>
            </Link>
          </>
        }
      />

      <div
        className={`mb-6 grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-5 ${
          filtersOpen ? "grid" : "hidden md:grid"
        }`}
      >
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ProjectStatus | "")}
          className="rounded-full border border-white/15 bg-black/40 px-4 py-2.5 text-sm"
        >
          <option value="">Status</option>
          {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={service}
          onChange={(e) => setService(e.target.value as ServiceType | "")}
          className="rounded-full border border-white/15 bg-black/40 px-4 py-2.5 text-sm"
        >
          <option value="">Usługa</option>
          {SERVICE_TYPES.map((t) => (
            <option key={t} value={t}>
              {SERVICE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          className="rounded-full border border-white/15 bg-black/40 px-4 py-2.5 text-sm"
        >
          <option value="">Assignee</option>
          {TEAM.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          value={billing}
          onChange={(e) =>
            setBilling(e.target.value as "w_toku" | "rozliczone" | "")
          }
          className="rounded-full border border-white/15 bg-black/40 px-4 py-2.5 text-sm"
        >
          <option value="">Billing</option>
          <option value="w_toku">W toku</option>
          <option value="rozliczone">Rozliczone</option>
        </select>
        <input
          value={clientQ}
          onChange={(e) => setClientQ(e.target.value)}
          placeholder="Klient…"
          className="rounded-full border border-white/15 bg-black/40 px-4 py-2.5 text-sm outline-none focus:border-white/35"
        />
      </div>

      {!filtered.length ? (
        <EmptyState
          title={projects.length ? "Brak wyników" : "Brak zleceń"}
          description="Utwórz zlecenie i przypisz klienta."
          action={
            <Link href="/admin/zlecenia/nowe">
              <Button>+ Nowe zlecenie</Button>
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {filtered.map((project) => (
            <li key={project.id}>
              <Link
                href={`/admin/zlecenia/${project.id}`}
                className="flex min-h-[72px] items-center justify-between gap-4 py-4 transition hover:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{project.title}</p>
                  <p className="mt-0.5 truncate text-sm text-white/45">
                    {project.crm_clients?.company_name ?? "Bez klienta"} ·{" "}
                    {SERVICE_TYPE_LABELS[project.service_type]} ·{" "}
                    {teamLabel(project.assigned_to)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <StatusPill>
                      {PROJECT_STATUS_LABELS[project.status]}
                    </StatusPill>
                    <StatusPill>
                      {
                        BILLING_STATUS_LABELS[
                          project.billing_status ?? "w_toku"
                        ]
                      }
                    </StatusPill>
                  </div>
                </div>
                <div className="shrink-0 text-right text-sm text-white/55">
                  {project.value_pln != null
                    ? `${project.value_pln.toLocaleString("pl-PL")} zł`
                    : "—"}
                  {project.deadline ? (
                    <p className="mt-1 text-xs text-white/30">
                      {new Date(project.deadline).toLocaleDateString("pl-PL")}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
