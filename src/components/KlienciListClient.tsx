"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { EmptyState, PageHeader, StatusPill } from "@/components/ui/CrmUi";
import type { CrmClient } from "@/lib/types";

function matches(hay: string | null | undefined, needle: string) {
  if (!needle.trim()) return true;
  return (hay ?? "").toLowerCase().includes(needle.toLowerCase());
}

export function KlienciListClient({ clients }: { clients: CrmClient[] }) {
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("");
  const [tag, setTag] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const industries = useMemo(
    () =>
      Array.from(
        new Set(clients.map((c) => c.industry).filter(Boolean) as string[]),
      ).sort(),
    [clients],
  );

  const allTags = useMemo(
    () =>
      Array.from(
        new Set(clients.flatMap((c) => c.tags ?? []).filter(Boolean)),
      ).sort(),
    [clients],
  );

  const filtered = clients.filter((c) => {
    const textOk =
      matches(c.company_name, q) ||
      matches(c.contact_name, q) ||
      matches(c.email, q) ||
      matches(c.phone, q) ||
      matches(c.industry, q) ||
      (c.tags ?? []).some((t) => matches(t, q));
    if (!textOk) return false;
    if (industry && c.industry !== industry) return false;
    if (tag && !(c.tags ?? []).includes(tag)) return false;
    if (from && c.created_at.slice(0, 10) < from) return false;
    if (to && c.created_at.slice(0, 10) > to) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Klienci"
        description="Baza kontaktów — filtruj, edytuj, dodawaj zlecenia."
        actions={
          <>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="md:hidden"
            >
              Filtry
            </Button>
            <Link href="/admin/klienci/nowy">
              <Button>+ Dodaj</Button>
            </Link>
          </>
        }
      />

      <div
        className={`mb-6 space-y-3 surface p-4 ${
          filtersOpen ? "block" : "hidden md:block"
        }`}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Szukaj: firma, kontakt, email, telefon…"
          className="glass-field w-full px-4 py-2.5 text-sm"
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="glass-field px-4 py-2.5 text-sm"
          >
            <option value="">Branża — wszystkie</option>
            {industries.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="glass-field px-4 py-2.5 text-sm"
          >
            <option value="">Tag — wszystkie</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <DateTimeField
            mode="date"
            value={from}
            onChange={setFrom}
            label="Od"
          />
          <DateTimeField
            mode="date"
            value={to}
            onChange={setTo}
            label="Do"
          />
        </div>
      </div>

      {!filtered.length ? (
        <EmptyState
          title={clients.length ? "Brak wyników" : "Brak klientów"}
          description={
            clients.length
              ? "Zmień filtry albo wyczyść wyszukiwanie."
              : "Dodaj pierwszego klienta CRM."
          }
          action={
            !clients.length ? (
              <Link href="/admin/klienci/nowy">
                <Button>+ Dodaj klienta</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="surface-list divide-y divide-white/10">
          {filtered.map((client) => (
            <li key={client.id}>
              <Link
                href={`/admin/klienci/${client.id}`}
                className="flex min-h-[72px] items-center justify-between gap-3 px-3 py-4 transition hover:bg-white/[0.04] sm:gap-4 md:px-5"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">
                    {client.company_name}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-white/45">
                    {client.contact_name ?? "—"}
                    {client.industry ? ` · ${client.industry}` : ""}
                  </p>
                  {(client.tags?.length ?? 0) > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {client.tags!.slice(0, 4).map((t) => (
                        <StatusPill key={t}>{t}</StatusPill>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[0.65rem] uppercase tracking-[0.14em] text-white/70">
                    Edytuj
                  </p>
                  {client.email ? (
                    <p className="mt-1 max-w-[9rem] truncate text-xs text-white/45 sm:max-w-none">
                      {client.email}
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
