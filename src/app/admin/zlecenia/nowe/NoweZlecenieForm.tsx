"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/CrmUi";
import {
  PROJECT_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
  SERVICE_TYPES,
} from "@/lib/intranet-labels";
import { TEAM } from "@/lib/team";
import type { CrmClient, ProjectStatus, ServiceType } from "@/lib/types";

export default function NoweZlecenieForm() {
  const searchParams = useSearchParams();
  const [crmClients, setCrmClients] = useState<CrmClient[]>([]);
  const [crmLoadError, setCrmLoadError] = useState("");
  const [title, setTitle] = useState("");
  const [crmClientId, setCrmClientId] = useState(
    searchParams.get("crm_client_id") ?? "",
  );
  const [serviceType, setServiceType] = useState<ServiceType>("inne");
  const [status, setStatus] = useState<ProjectStatus>("nowe");
  const [assignedTo, setAssignedTo] = useState("jakub");
  const [deadline, setDeadline] = useState("");
  const [valuePln, setValuePln] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const preset = searchParams.get("crm_client_id");
    if (preset) setCrmClientId(preset);
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/crm-clients", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setCrmLoadError(
            typeof data.error === "string"
              ? data.error
              : "Nie udało się pobrać klientów CRM",
          );
          setCrmClients([]);
          return;
        }
        setCrmClients(Array.isArray(data) ? data : []);
      })
      .catch(() => setCrmLoadError("Błąd sieci przy pobieraniu klientów CRM"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crmClientId) {
      setError("Wybierz klienta CRM — zlecenie musi być do kogoś przypisane.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        title,
        crm_client_id: crmClientId,
        service_type: serviceType,
        status,
        assigned_to: assignedTo || null,
        deadline: deadline || null,
        description,
        value_pln: valuePln === "" ? null : Number(valuePln),
        billing_status: "w_toku",
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Błąd tworzenia");
      setLoading(false);
      return;
    }

    window.location.assign(`/admin/zlecenia/${data.id}`);
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        eyebrow="Zlecenie"
        title="Nowe zlecenie"
        description="Zawsze przypisane do klienta CRM."
      />
      <Link
        href="/admin/zlecenia"
        className="inline-block text-sm text-white/45 hover:text-white"
      >
        ← Anuluj
      </Link>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Tytuł zlecenia"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="space-y-2">
          <label className="block text-sm text-white/70">Klient CRM *</label>
          <select
            value={crmClientId}
            onChange={(e) => setCrmClientId(e.target.value)}
            required
            className="w-full rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm"
          >
            <option value="">— wybierz klienta —</option>
            {crmClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </select>
          {crmLoadError && <p className="text-xs text-red-400">{crmLoadError}</p>}
          {!crmLoadError && !crmClients.length && (
            <p className="text-xs text-white/40">
              Brak klientów.{" "}
              <Link href="/admin/klienci/nowy" className="underline">
                Dodaj klienta CRM
              </Link>
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm text-white/70">Typ usługi</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as ServiceType)}
              className="w-full rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm"
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
              className="w-full rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm"
            >
              {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-white/70">Przypisane do</label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm"
          >
            {TEAM.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Deadline"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
        <Input
          label="Cena usługi (PLN)"
          type="number"
          value={valuePln}
          onChange={(e) => setValuePln(e.target.value)}
        />

        <div className="space-y-2">
          <label className="block text-sm text-white/70">Opis</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" disabled={loading || !crmClientId} className="w-full">
          {loading ? "Zapisywanie..." : "Utwórz zlecenie"}
        </Button>
      </form>
    </div>
  );
}
