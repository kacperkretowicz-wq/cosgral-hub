import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { getIntranetDb } from "@/lib/intranet-db";
import {
  BILLING_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
} from "@/lib/intranet-labels";
import { teamLabel } from "@/lib/team";
import type { Project } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ZleceniaPage() {
  let projects: Project[] = [];
  let error = "";

  try {
    projects = await getIntranetDb().getProjects();
  } catch (e) {
    error = e instanceof Error ? e.message : "Błąd ładowania";
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Zlecenia</h1>
          <p className="mt-1 text-sm text-white/50">
            Wszystkie projekty agencji — status, deadline, przypisanie
          </p>
        </div>
        <Link href="/admin/zlecenia/nowe">
          <Button>+ Nowe zlecenie</Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error.includes("projects") || error.toLowerCase().includes("schema") ? (
            <>
              Uruchom migrację SQL{" "}
              <code className="text-xs">002_intranet_schema.sql</code> w
              Supabase — bez tego zlecenia się nie zapisują.
            </>
          ) : (
            error
          )}
        </div>
      )}

      {!projects.length ? (
        <GlassCard>
          <p className="text-white/50">Brak zleceń. Utwórz pierwsze i przypisz klienta CRM.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/admin/zlecenia/${project.id}`}>
              <div className="glass rounded-lg p-5 transition hover:bg-white/8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-bold">{project.title}</h2>
                    <p className="text-sm text-white/50">
                      {project.crm_clients?.company_name ?? "Bez klienta CRM"} ·{" "}
                      {SERVICE_TYPE_LABELS[project.service_type]} ·{" "}
                      {teamLabel(project.assigned_to)}
                    </p>
                    <p className="mt-1 text-xs text-white/35">
                      {BILLING_STATUS_LABELS[project.billing_status ?? "wycena"]}
                      {project.value_pln != null
                        ? ` · ${project.value_pln.toLocaleString("pl-PL")} zł`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-medium ${PROJECT_STATUS_COLORS[project.status]}`}
                    >
                      {PROJECT_STATUS_LABELS[project.status]}
                    </p>
                    {project.deadline && (
                      <p className="text-xs text-white/30">
                        {new Date(project.deadline).toLocaleDateString("pl-PL")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
