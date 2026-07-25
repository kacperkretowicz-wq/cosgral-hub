"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  PROJECT_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
  SERVICE_TYPES,
} from "@/lib/intranet-labels";
import type { CrmClient, ProjectStatus, ServiceType } from "@/lib/types";

export default function NoweZleceniePage() {
  const router = useRouter();
  const [crmClients, setCrmClients] = useState<CrmClient[]>([]);
  const [title, setTitle] = useState("");
  const [crmClientId, setCrmClientId] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("inne");
  const [status, setStatus] = useState<ProjectStatus>("nowe");
  const [assignedTo, setAssignedTo] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/crm-clients")
      .then((r) => r.json())
      .then((data) => setCrmClients(Array.isArray(data) ? data : []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        crm_client_id: crmClientId || null,
        service_type: serviceType,
        status,
        assigned_to: assignedTo || null,
        deadline: deadline || null,
        description,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Błąd tworzenia");
      setLoading(false);
      return;
    }

    router.push(`/admin/zlecenia/${data.id}`);
  };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/zlecenia"
          className="text-sm text-white/50 hover:text-white"
        >
          ← Zlecenia
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Nowe zlecenie</h1>
      </div>

      <GlassCard>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tytuł zlecenia"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="space-y-2">
            <label className="block text-sm text-white/70">Klient CRM</label>
            <select
              value={crmClientId}
              onChange={(e) => setCrmClientId(e.target.value)}
              className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
            >
              <option value="">— bez przypisania —</option>
              {crmClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm text-white/70">Typ usługi</label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as ServiceType)}
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
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
              >
                {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Przypisane do (email)"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="np. jakub.gral00@gmail.com"
          />
          <Input
            label="Deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />

          <div className="space-y-2">
            <label className="block text-sm text-white/70">Opis</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? "Zapisywanie..." : "Utwórz zlecenie"}
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
