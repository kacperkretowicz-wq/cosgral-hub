"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  BILLING_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
} from "@/lib/intranet-labels";
import { teamLabel } from "@/lib/team";
import type { BillingStatus, Project } from "@/lib/types";

function formatPln(n: number) {
  return n.toLocaleString("pl-PL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function isThisMonth(iso: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}

export default function FinansePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<BillingStatus | "">("");

  useEffect(() => {
    fetch("/api/projects", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(typeof data.error === "string" ? data.error : "Błąd");
          return;
        }
        setProjects(Array.isArray(data) ? data : []);
      })
      .catch(() => setError("Błąd sieci"));
  }, []);

  const filtered = filter
    ? projects.filter((p) => p.billing_status === filter)
    : projects;

  const paidThisMonth = projects.filter(
    (p) =>
      p.billing_status === "oplacone" &&
      p.value_pln != null &&
      (isThisMonth(p.paid_at) || (!p.paid_at && isThisMonth(p.updated_at))),
  );
  const mtd = paidThisMonth.reduce((s, p) => s + (p.value_pln ?? 0), 0);
  const costsMtd = paidThisMonth.reduce((s, p) => s + (p.cost_pln ?? 0), 0);
  const pipeline = projects
    .filter(
      (p) =>
        (p.billing_status === "wycena" || p.billing_status === "faktura") &&
        p.value_pln != null,
    )
    .reduce((s, p) => s + (p.value_pln ?? 0), 0);
  const marginMtd = mtd - costsMtd;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Finanse</h1>
        <p className="mt-1 text-sm text-white/50">
          Przychód, koszty i pipeline rozliczeń
        </p>
      </div>

      {error && (
        <div className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-white/40">
            Przychód MTD
          </p>
          <p className="mt-2 text-3xl font-bold">{formatPln(mtd)} zł</p>
          <p className="mt-1 text-xs text-white/40">
            {paidThisMonth.length} opłaconych
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-white/40">
            Marża MTD
          </p>
          <p className="mt-2 text-3xl font-bold">{formatPln(marginMtd)} zł</p>
          <p className="mt-1 text-xs text-white/40">
            koszty {formatPln(costsMtd)} zł
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-white/40">
            Pipeline
          </p>
          <p className="mt-2 text-3xl font-bold">{formatPln(pipeline)} zł</p>
          <p className="mt-1 text-xs text-white/40">wycena + faktura</p>
        </GlassCard>
      </div>

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
        {(Object.keys(BILLING_STATUS_LABELS) as BillingStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-sm px-3 py-1.5 text-xs ${
              filter === s ? "bg-white text-black" : "bg-white/10 text-white/60"
            }`}
          >
            {BILLING_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {!filtered.length ? (
          <GlassCard>
            <p className="text-white/50">Brak zleceń w tym filtrze.</p>
          </GlassCard>
        ) : (
          filtered.map((p) => (
            <Link
              key={p.id}
              href={`/admin/zlecenia/${p.id}`}
              className="block glass rounded-lg p-4 transition hover:bg-white/8"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{p.title}</p>
                  <p className="text-sm text-white/50">
                    {p.crm_clients?.company_name ?? "—"} ·{" "}
                    {SERVICE_TYPE_LABELS[p.service_type]} ·{" "}
                    {teamLabel(p.assigned_to)}
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    {PROJECT_STATUS_LABELS[p.status]} ·{" "}
                    {BILLING_STATUS_LABELS[p.billing_status ?? "wycena"]}
                    {p.paid_at ? ` · płatne ${p.paid_at}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    {p.value_pln != null ? `${formatPln(p.value_pln)} zł` : "—"}
                  </p>
                  {p.value_pln != null && p.cost_pln != null && (
                    <p className="text-xs text-white/40">
                      marża {formatPln(p.value_pln - p.cost_pln)} zł
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
