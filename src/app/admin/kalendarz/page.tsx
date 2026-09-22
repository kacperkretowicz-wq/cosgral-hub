"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { EmptyState, PageHeader } from "@/components/ui/CrmUi";
import { TEAM } from "@/lib/team";
import type { CalendarEvent } from "@/lib/types";

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  const dow = (first.getDay() + 6) % 7; // Mon=0
  start.setDate(1 - dow);
  const weeks: Date[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) {
      row.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(row);
  }
  return weeks;
}

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function KalendarzPage() {
  const now = new Date();
  const [cursor, setCursor] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [notes, setNotes] = useState("");
  const [attendees, setAttendees] = useState<string[]>(["jakub"]);
  const [busy, setBusy] = useState(false);

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

  const weeks = useMemo(
    () => monthMatrix(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = ev.starts_at.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const upcoming = useMemo(
    () =>
      events
        .filter((e) => new Date(e.starts_at).getTime() >= Date.now() - 86400000)
        .slice(0, 20),
    [events],
  );

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startsAt) return;
    setBusy(true);
    const res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        starts_at: new Date(startsAt).toISOString(),
        remind_at: remindAt ? new Date(remindAt).toISOString() : null,
        notes,
        attendees,
        all_day: false,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Błąd");
      return;
    }
    setTitle("");
    setStartsAt("");
    setRemindAt("");
    setNotes("");
    await load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/calendar?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await load();
  };

  const monthLabel = cursor.toLocaleDateString("pl-PL", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Kalendarz"
        description="Miesiąc na desktopie, agenda na mobile. Przypomnienia → Telegram."
      />

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={addEvent}
        className="mb-8 space-y-3 surface p-4"
      >
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
            label="Przypomnij (WhatsApp / mail)"
            value={remindAt}
            onChange={setRemindAt}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          {TEAM.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm text-white/60">
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
        <Button type="submit" disabled={busy}>
          {busy ? "…" : "+ Dodaj wydarzenie"}
        </Button>
      </form>

      <div className="mb-4 flex items-center justify-between">
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

      <div className="mb-10 hidden md:block">
        <div className="mb-2 grid grid-cols-7 gap-1 text-center font-mono text-[0.62rem] uppercase tracking-[0.14em] text-white/35">
          {["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Ndz"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((day) => {
            const key = isoDay(day);
            const inMonth = day.getMonth() === cursor.getMonth();
            const dayEvents = byDay.get(key) ?? [];
            return (
              <div
                key={key + day.getTime()}
                className={`min-h-[88px] rounded-xl border border-white/10 p-2 ${
                  inMonth ? "bg-white/[0.02]" : "opacity-35"
                }`}
              >
                <p className="text-xs text-white/50">{day.getDate()}</p>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <p
                      key={ev.id}
                      className="truncate rounded bg-white/10 px-1 py-0.5 text-[10px] text-white/80"
                      title={ev.title}
                    >
                      {ev.title}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="md:hidden">
        <p className="label-mono mb-3">Agenda</p>
        {!upcoming.length ? (
          <EmptyState title="Brak nadchodzących wydarzeń" />
        ) : (
          <ul className="surface-list divide-y divide-white/8">
            {upcoming.map((ev) => (
              <li key={ev.id} className="flex items-start justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">{ev.title}</p>
                  <p className="mt-1 text-xs text-white/40">
                    {new Date(ev.starts_at).toLocaleString("pl-PL")}
                    {ev.remind_at
                      ? ` · TG ${new Date(ev.remind_at).toLocaleString("pl-PL")}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(ev.id)}
                  className="text-xs text-red-300/70"
                >
                  Usuń
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8 hidden md:block">
        <p className="label-mono mb-3">Lista</p>
        {!events.length ? (
          <EmptyState title="Kalendarz pusty" />
        ) : (
          <ul className="surface-list divide-y divide-white/8">
            {events.map((ev) => (
              <li
                key={ev.id}
                className="flex items-start justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-medium">{ev.title}</p>
                  <p className="text-xs text-white/40">
                    {new Date(ev.starts_at).toLocaleString("pl-PL")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(ev.id)}
                  className="text-xs text-red-300/70"
                >
                  Usuń
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
