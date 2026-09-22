"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmptyState, PageHeader, StatusPill } from "@/components/ui/CrmUi";
import { BarChart, DonutChart } from "@/components/ui/GlassChart";
import {
  isBillingInProgress,
  isBillingSettled,
} from "@/lib/intranet-labels";
import type { Project } from "@/lib/types";

function formatPln(n: number) {
  return n.toLocaleString("pl-PL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function FinansePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Błąd");
        return;
      }
      setProjects(Array.isArray(data) ? data : []);
      setError("");
    } catch {
      setError("Błąd sieci");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const withValue = projects.filter((p) => p.value_pln != null);
  const inProgress = withValue.filter((p) =>
    isBillingInProgress(p.billing_status),
  );
  const lifetime = withValue.reduce((s, p) => s + (p.value_pln ?? 0), 0);
  const wToku = inProgress.reduce((s, p) => s + (p.value_pln ?? 0), 0);

  const markSettled = async (id: string) => {
    setBusyId(id);
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billing_status: "rozliczone" }),
    });
    setBusyId(null);
    await load();
  };

  const reopen = async (id: string) => {
    setBusyId(id);
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billing_status: "w_toku" }),
    });
    setBusyId(null);
    await load();
  };

  const settled = useMemo(
    () => withValue.filter((p) => isBillingSettled(p.billing_status)),
    [withValue],
  );
  const billingChart = useMemo(
    () =>
      [
        { label: "W toku", value: wToku },
        {
          label: "Rozliczone",
          value: settled.reduce((s, p) => s + (p.value_pln ?? 0), 0),
        },
      ].filter((i) => i.value > 0),
    [wToku, settled],
  );
  const topValues = useMemo(
    () =>
      [...withValue]
        .sort((a, b) => (b.value_pln ?? 0) - (a.value_pln ?? 0))
        .slice(0, 6)
        .map((p) => ({
          label: p.title,
          value: p.value_pln ?? 0,
        })),
    [withValue],
  );

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Finanse"
        description="W toku vs od początku — rozliczenie spada z puli bieżącej."
      />

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="surface p-5 sm:p-6">
          <p className="label-mono mb-2">W toku</p>
          <p className="text-3xl font-semibold tracking-tight text-white">
            {formatPln(wToku)} zł
          </p>
          <p className="mt-2 text-sm text-white/40">
            {inProgress.length} zleceń nierozliczonych
          </p>
        </div>
        <div className="surface p-5 sm:p-6">
          <p className="label-mono mb-2">Od początku</p>
          <p className="text-3xl font-semibold tracking-tight text-white">
            {formatPln(lifetime)} zł
          </p>
          <p className="mt-2 text-sm text-white/40">
            Suma wszystkich value_pln
          </p>
        </div>
      </div>

      {(billingChart.length > 0 || topValues.length > 0) && (
        <div className="mb-10 grid gap-3 lg:grid-cols-2">
          {billingChart.length ? (
            <section className="surface p-5">
              <p className="label-mono mb-4">Podział kwot</p>
              <DonutChart items={billingChart} />
            </section>
          ) : null}
          {topValues.length ? (
            <section className="surface p-5">
              <p className="label-mono mb-4">Największe zlecenia</p>
              <BarChart items={topValues} />
            </section>
          ) : null}
        </div>
      )}

      <p className="label-mono mb-3">W toku — lista</p>
      {!inProgress.length ? (
        <EmptyState title="Nic w toku" description="Wszystkie zlecenia z ceną są rozliczone albo brak kwot." />
      ) : (
        <ul className="mb-10 surface-list divide-y divide-white/8">
          {inProgress.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4"
            >
              <div>
                <Link
                  href={`/admin/zlecenia/${p.id}`}
                  className="font-medium hover:underline"
                >
                  {p.title}
                </Link>
                <p className="mt-1 text-sm text-white/45">
                  {p.crm_clients?.company_name ?? "—"} ·{" "}
                  {formatPln(p.value_pln ?? 0)} zł
                </p>
              </div>
              <Button
                variant="secondary"
                type="button"
                disabled={busyId === p.id}
                onClick={() => void markSettled(p.id)}
              >
                Rozliczono
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p className="label-mono mb-3">Rozliczone</p>
      {!settled.length ? (
        <p className="text-sm text-white/40">Brak rozliczonych.</p>
      ) : (
        <ul className="surface-list divide-y divide-white/8">
          {settled.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div>
                <Link
                  href={`/admin/zlecenia/${p.id}`}
                  className="text-white/70 hover:text-white hover:underline"
                >
                  {p.title}
                </Link>
                <div className="mt-1 flex items-center gap-2">
                  <StatusPill tone="ok">Rozliczone</StatusPill>
                  <span className="text-sm text-white/40">
                    {formatPln(p.value_pln ?? 0)} zł
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="text-xs text-white/40 underline"
                disabled={busyId === p.id}
                onClick={() => void reopen(p.id)}
              >
                Cofnij
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
