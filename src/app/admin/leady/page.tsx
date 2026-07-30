"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";
import { LEAD_STATUS_LABELS } from "@/lib/intranet-labels";
import type { Lead, LeadStatus } from "@/lib/types";

const STATUSES = Object.keys(LEAD_STATUS_LABELS) as LeadStatus[];

export default function LeadyPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<LeadStatus | "">("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    const q = filter ? `?status=${filter}` : "";
    const res = await fetch(`/api/leads${q}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      setError(
        typeof data.error === "string"
          ? data.error
          : "Błąd ładowania — uruchom migrację 008_agency_os.sql",
      );
      setLeads([]);
      return;
    }
    setLeads(Array.isArray(data) ? data : []);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const addManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: companyName,
        email,
        message,
        source: "manual",
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Błąd zapisu");
      return;
    }
    setCompanyName("");
    setEmail("");
    setMessage("");
    await load();
  };

  const setStatus = async (id: string, status: LeadStatus) => {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  };

  const convert = async (id: string) => {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ convert_to_crm: true, status: "kontakt" }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(typeof data.error === "string" ? data.error : "Błąd konwersji");
      return;
    }
    await load();
    if (data.crm_client_id) {
      window.location.assign(`/admin/klienci/${data.crm_client_id}`);
    }
  };

  const openOffer = async (lead: Lead) => {
    if (lead.status !== "oferta" && lead.status !== "wygrana") {
      await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "oferta" }),
      });
    }
    const params = new URLSearchParams({ company: lead.company_name });
    if (lead.crm_client_id) params.set("crm", lead.crm_client_id);
    window.location.assign(`/admin/generator?${params.toString()}`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Leady</h1>
        <p className="mt-1 text-sm text-white/50">
          Pipeline zapytań — ręcznie lub z formularza na stronie Cosgral
        </p>
      </div>

      {error && (
        <div className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <GlassCard title="Dodaj lead ręcznie">
        <form onSubmit={addManual} className="space-y-3">
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            placeholder="Firma"
            className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email"
            className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Wiadomość"
            rows={2}
            className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={saving}>
            {saving ? "Zapisywanie…" : "Dodaj lead"}
          </Button>
        </form>
        <p className="mt-4 text-xs text-white/40">
          Integracja ze stroną:{" "}
          <code className="text-white/60">POST /api/leads</code> z JSON (
          company_name, email, message). Opcjonalnie nagłówek{" "}
          <code className="text-white/60">x-leads-secret</code> ={" "}
          <code className="text-white/60">LEADS_INTAKE_SECRET</code>.
        </p>
      </GlassCard>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("")}
          className={`rounded-sm px-3 py-1.5 text-xs ${
            !filter ? "bg-white text-black" : "bg-white/10 text-white/60"
          }`}
        >
          Wszystkie
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-sm px-3 py-1.5 text-xs ${
              filter === s ? "bg-white text-black" : "bg-white/10 text-white/60"
            }`}
          >
            {LEAD_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {!leads.length ? (
        <GlassCard>
          <p className="text-white/50">Brak leadów w tym filtrze.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <div key={lead.id} className="glass rounded-lg p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{lead.company_name}</p>
                  <p className="text-sm text-white/50">
                    {lead.email ?? "—"} · {lead.source} ·{" "}
                    {new Date(lead.created_at).toLocaleDateString("pl-PL")}
                  </p>
                  {lead.message && (
                    <p className="mt-2 text-sm text-white/70 whitespace-pre-wrap">
                      {lead.message}
                    </p>
                  )}
                </div>
                <DeleteRecordButton
                  apiUrl={`/api/leads/${lead.id}`}
                  redirectTo="/admin/leady"
                  confirmMessage={`Usunąć lead „${lead.company_name}”?`}
                  label="Usuń"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(lead.id, s)}
                    className={`rounded px-2 py-1 text-xs ${
                      lead.status === s
                        ? "bg-white text-black"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {LEAD_STATUS_LABELS[s]}
                  </button>
                ))}
                {!lead.crm_client_id ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-3 py-1 text-xs"
                    onClick={() => convert(lead.id)}
                  >
                    → CRM
                  </Button>
                ) : (
                  <Link
                    href={`/admin/klienci/${lead.crm_client_id}`}
                    className="rounded bg-white/10 px-2 py-1 text-xs text-white/70 underline"
                  >
                    Profil CRM
                  </Link>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  className="px-3 py-1 text-xs"
                  onClick={() => openOffer(lead)}
                >
                  → Oferta Cosgral
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
