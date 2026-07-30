"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { NotesPanel } from "@/components/NotesPanel";
import { ResourceLinksPanel } from "@/components/ResourceLinksPanel";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";
import {
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
  SERVICE_TYPES,
} from "@/lib/intranet-labels";
import type { CrmClient, Project, ProjectStatus, ServiceType } from "@/lib/types";

interface ZlecenieEditorProps {
  initialProject: Project;
}

export function ZlecenieEditor({ initialProject }: ZlecenieEditorProps) {
  const [project, setProject] = useState(initialProject);
  const [crmClients, setCrmClients] = useState<CrmClient[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    fetch("/api/crm-clients", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setCrmClients(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const updateField = async (field: Partial<Project>) => {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(field),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(
          typeof data.error === "string" ? data.error : "Nie udało się zapisać",
        );
        return;
      }
      setProject(data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/zlecenia"
            className="text-sm text-white/50 hover:text-white"
          >
            ← Zlecenia
          </Link>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">{project.title}</h1>
          {project.crm_clients ? (
            <Link
              href={`/admin/klienci/${project.crm_clients.id}`}
              className="text-sm text-white/50 hover:text-white"
            >
              {project.crm_clients.company_name}
            </Link>
          ) : (
            <p className="text-sm text-amber-300/80">
              Brak przypisanego klienta CRM
            </p>
          )}
        </div>
        <DeleteRecordButton
          apiUrl={`/api/projects/${project.id}`}
          redirectTo="/admin/zlecenia"
          label="Usuń zlecenie"
          confirmMessage={`Usunąć zlecenie „${project.title}”? Powiązana oferta WWW oraz notatki/linki też zostaną usunięte.`}
        />
      </div>

      {saveError && (
        <div className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {saveError}
        </div>
      )}

      <GlassCard title="Szczegóły">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label className="block text-sm text-white/70">Klient CRM *</label>
            <select
              value={project.crm_client_id ?? ""}
              onChange={(e) =>
                updateField({ crm_client_id: e.target.value || null })
              }
              disabled={saving}
              className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
            >
              <option value="">— wybierz klienta —</option>
              {crmClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-white/70">Typ usługi</label>
            <select
              value={project.service_type}
              onChange={(e) =>
                updateField({ service_type: e.target.value as ServiceType })
              }
              disabled={saving}
              className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
            >
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SERVICE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-white/70">Status</label>
            <select
              value={project.status}
              onChange={(e) =>
                updateField({ status: e.target.value as ProjectStatus })
              }
              disabled={saving}
              className={`w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm ${PROJECT_STATUS_COLORS[project.status]}`}
            >
              {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-white/70">Przypisane do</label>
            <input
              value={project.assigned_to ?? ""}
              onBlur={(e) =>
                updateField({ assigned_to: e.target.value || null })
              }
              onChange={(e) =>
                setProject((p) => ({ ...p, assigned_to: e.target.value || null }))
              }
              className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-white/70">Deadline</label>
            <input
              type="date"
              value={project.deadline ?? ""}
              onChange={(e) =>
                updateField({ deadline: e.target.value || null })
              }
              disabled={saving}
              className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <label className="block text-sm text-white/70">Opis</label>
          <textarea
            value={project.description ?? ""}
            onBlur={(e) => updateField({ description: e.target.value })}
            onChange={(e) =>
              setProject((p) => ({ ...p, description: e.target.value }))
            }
            rows={3}
            className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
          />
        </div>

        {saving && <p className="mt-2 text-xs text-white/40">Zapisywanie…</p>}
      </GlassCard>

      <GlassCard title="Notatki">
        <NotesPanel entityId={project.id} entityType="project" />
      </GlassCard>

      <GlassCard title="Linki">
        <ResourceLinksPanel entityId={project.id} entityType="project" />
      </GlassCard>

      {!project.crm_clients && (
        <div className="rounded-sm border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          To zlecenie nie jest przypisane do klienta CRM — nie pojawi się na
          karcie klienta.{" "}
          <Link href="/admin/klienci" className="underline">
            Wybierz klienta
          </Link>{" "}
          przy edycji lub utwórz zlecenie ponownie z wybranym klientem.
        </div>
      )}
    </div>
  );
}
