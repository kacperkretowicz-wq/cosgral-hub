"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MonthCal } from "@/components/MonthCal";
import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { EmptyState, PageHeader } from "@/components/ui/CrmUi";
import { formatDayLong, isoDay } from "@/lib/month-cal";
import { TEAM } from "@/lib/team";
import type { CalendarEvent } from "@/lib/types";

export default function KalendarzPage() {
  const now = new Date();
  const [cursor, setCursor] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [notes, setNotes] = useState("");
  const [attendees, setAttendees] = useState<string[]>(["jakub"]);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Błąd");
        return;
      }
      setEvents(Array.isArray(data) ? data : []);
      setError("");
    } catch {
      setError("Błąd sieci");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(id);
  }, [load]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const ev of events) {
      const key = ev.starts_at.slice(0, 10);
      (map[key] ??= []).push(ev.title);
    }
    return map;
  }, [events]);

  const listed = useMemo(() => {
    const filtered = selectedDay
      ? events.filter((e) => e.starts_at.slice(0, 10) === selectedDay)
      : events;
    return [...filtered].sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
  }, [events, selectedDay]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setStartsAt("");
    setRemindAt("");
    setNotes("");
    setAttendees(["jakub"]);
  };

  const beginEdit = (ev: CalendarEvent) => {
    setEditingId(ev.id);
    setTitle(ev.title);
    setStartsAt(ev.starts_at.slice(0, 16));
    setRemindAt(ev.remind_at ? ev.remind_at.slice(0, 16) : "");
    setNotes(ev.notes ?? "");
    setAttendees(ev.attendees?.length ? ev.attendees : ["jakub"]);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onSelectDay = (day: string) => {
    setSelectedDay((prev) => (prev === day ? null : day));
    if (!editingId) {
      setStartsAt(`${day}T10:00`);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startsAt) return;
    setBusy(true);

    const payload = {
      title: title.trim(),
      starts_at: new Date(startsAt).toISOString(),
      remind_at: remindAt ? new Date(remindAt).toISOString() : null,
      notes,
      attendees,
      all_day: false,
    };

    const res = await fetch(
      editingId
        ? `/api/calendar?id=${encodeURIComponent(editingId)}`
        : "/api/calendar",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId ? { id: editingId, ...payload } : payload,
        ),
      },
    );
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Błąd");
      return;
    }
    resetForm();
    await load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/calendar?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (editingId === id) resetForm();
    await load();
  };

  const monthLabel = cursor.toLocaleDateString("pl-PL", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="CRM"
        title="Kalendarz"
        description="Kliknij dzień, żeby zobaczyć eventy i dodać nowe. Przypomnienia → push / mail."
      />

      {error ? (
        <div className="order-0 mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="order-1 mb-6 md:order-2 md:mb-10">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/70"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
              )
            }
          >
            ←
          </button>
          <p className="label-mono capitalize">{monthLabel}</p>
          <button
            type="button"
            className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/70"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
              )
            }
          >
            →
          </button>
        </div>
        <div className="surface overflow-visible p-2 sm:p-3 md:p-4">
          <MonthCal
            year={cursor.getFullYear()}
            month={cursor.getMonth()}
            eventsByDay={eventsByDay}
            selectedDay={selectedDay}
            onSelectDay={onSelectDay}
          />
        </div>
      </div>

      <form
        ref={formRef}
        onSubmit={save}
        className="order-3 mb-8 space-y-3 surface p-4 md:order-1"
      >
        <p className="label-mono text-white/55">
          {editingId ? "Edycja wydarzenia" : "Nowe wydarzenie"}
        </p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tytuł wydarzenia"
          required
          className="w-full rounded-full border border-white/15 bg-black/40 px-4 py-2.5 text-sm outline-none focus:border-white/35"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <DateTimeField
            mode="datetime"
            label="Start"
            value={startsAt}
            onChange={setStartsAt}
            allowClear={false}
          />
          <DateTimeField
            mode="datetime"
            label="Przypomnij (push / mail)"
            value={remindAt}
            onChange={setRemindAt}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          {TEAM.map((m) => (
            <label
              key={m.id}
              className="flex items-center gap-2 text-sm text-white/60"
            >
              <input
                type="checkbox"
                checked={attendees.includes(m.id)}
                onChange={(e) =>
                  setAttendees((prev) =>
                    e.target.checked
                      ? [...prev, m.id]
                      : prev.filter((x) => x !== m.id),
                  )
                }
              />
              {m.label}
            </label>
          ))}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Notatki"
          className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "…" : editingId ? "Zapisz zmiany" : "+ Dodaj wydarzenie"}
          </Button>
          {editingId ? (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Anuluj
            </Button>
          ) : null}
        </div>
      </form>

      <div className="order-2 mb-8 md:order-3">
        <div className="mb-3 flex items-end justify-between gap-3">
          <p className="label-mono">
            {selectedDay ? formatDayLong(selectedDay) : "Wszystkie wydarzenia"}
          </p>
          {selectedDay ? (
            <button
              type="button"
              className="text-[0.65rem] uppercase tracking-[0.14em] text-white/50"
              onClick={() => setSelectedDay(null)}
            >
              Pokaż wszystkie
            </button>
          ) : null}
        </div>
        {!listed.length ? (
          <EmptyState
            title={
              selectedDay ? "Brak wydarzeń tego dnia" : "Kalendarz pusty"
            }
          />
        ) : (
          <ul className="surface-list divide-y divide-white/8">
            {listed.map((ev) => (
              <li
                key={ev.id}
                className="flex items-start justify-between gap-3 py-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">{ev.title}</p>
                  <p className="mt-1 text-xs text-white/40">
                    {new Date(ev.starts_at).toLocaleString("pl-PL")}
                    {ev.remind_at
                      ? ` · przypomnienie ${new Date(ev.remind_at).toLocaleString("pl-PL")}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={() => beginEdit(ev)}
                    className="text-[0.65rem] uppercase tracking-[0.14em] text-white/55"
                  >
                    Edytuj
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(ev.id)}
                    className="text-xs text-red-300/70"
                  >
                    Usuń
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
