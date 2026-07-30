"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
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
import type { Project, ProjectStatus, ServiceType } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ZlecenieDetailPage({ params }: Props) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState("");

  useEffect(() => {
    params.then(({ id: projectId }) => {
      setId(projectId);
      fetch(`/api/projects/${projectId}`)
        .then((r) => {
          if (!r.ok) throw new Error("not found");
          return r.json();
        })
        .then(setProject)
        .catch(() => setProject(null))
        .finally(() => setLoading(false));
    });
  }, [params]);

  if (loading) {
    return <p className="text-white/50">Ładowanie...</p>;
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Link href="/admin/zlecenia" className="text-sm text-white/50 hover:text-white">
          ← Zlecenia
        </Link>
        <p className="text-white/50">Nie znaleziono zlecenia.</p>
      </div>
    );
  }

  const updateField = async (field: Partial<Project>) => {
    setSaving(true);
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(field),
    });
    const data = await res.json();
    if (res.ok) setProject(data);
    setSaving(false);
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
          {project.crm_clients && (
            <Link
              href={`/admin/klienci/${project.crm_clients.id}`}
              className="text-sm text-white/50 hover:text-white"
            >
              {project.crm_clients.company_name}
            </Link>
          )}
        </div>
        <DeleteRecordButton
          apiUrl={`/api/projects/${id}`}
          redirectTo="/admin/zlecenia"
          label="Usuń zlecenie"
          confirmMessage={`Usunąć zlecenie „${project.title}”? Powiązana oferta WWW oraz notatki/linki też zostaną usunięte.`}
        />
      </div>

      <GlassCard title="Szczegóły">
        <div className="grid gap-4 sm:grid-cols-2">
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
              onChange={(e) => updateField({ assigned_to: e.target.value || null })}
              className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-white/70">Deadline</label>
            <input
              type="date"
              value={project.deadline ?? ""}
              onChange={(e) => updateField({ deadline: e.target.value || null })}
              className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {project.description && (
          <p className="mt-4 text-sm text-white/60 whitespace-pre-wrap">
            {project.description}
          </p>
        )}
      </GlassCard>

      <GlassCard title="Notatki">
        <NotesPanel entityId={id} entityType="project" />
      </GlassCard>

      <GlassCard title="Linki">
        <ResourceLinksPanel entityId={id} entityType="project" />
      </GlassCard>
    </div>
  );
}
