"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/Button";
import { Portal } from "@/components/ui/Portal";

const WEEK = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toDateTimeValue(d: Date) {
  return `${toDateValue(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseValue(value: string, mode: "date" | "datetime"): Date | null {
  if (!value) return null;
  if (mode === "date") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  return new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    0,
    0,
  );
}

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  const dow = (first.getDay() + 6) % 7;
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

function formatDisplay(value: string, mode: "date" | "datetime") {
  const d = parseValue(value, mode);
  if (!d) return mode === "date" ? "Wybierz datę" : "Wybierz datę i godzinę";
  if (mode === "date") {
    return d.toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  return d.toLocaleString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  mode?: "date" | "datetime";
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
};

export function DateTimeField({
  mode = "date",
  value,
  onChange,
  label,
  disabled,
  className = "",
  allowClear = true,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const selected = parseValue(value, mode);
  const [cursor, setCursor] = useState(() => selected ?? new Date());
  const [hour, setHour] = useState(() => selected?.getHours() ?? 9);
  const [minute, setMinute] = useState(() => {
    const m = selected?.getMinutes() ?? 0;
    return (Math.round(m / 5) * 5) % 60;
  });

  useEffect(() => {
    if (!open) return;
    const d = parseValue(value, mode) ?? new Date();
    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    setHour(d.getHours());
    setMinute((Math.round(d.getMinutes() / 5) * 5) % 60);
  }, [open, value, mode]);

  const updatePanelPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 16);
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - width - 8,
    );
    const estimatedHeight = mode === "datetime" ? 440 : 380;
    const gap = 8;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    let top = rect.bottom + gap;
    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      top = Math.max(8, rect.top - estimatedHeight - gap);
    }
    const maxTop = window.innerHeight - estimatedHeight - 8;
    top = Math.min(Math.max(8, top), maxTop);
    setPanelStyle({ top, left, width });
  }, [mode]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return;
    }
    updatePanelPosition();
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, updatePanelPosition]);

  const weeks = useMemo(
    () => monthMatrix(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  const monthLabel = cursor.toLocaleDateString("pl-PL", {
    month: "long",
    year: "numeric",
  });

  const pickDay = (day: Date) => {
    if (mode === "date") {
      onChange(toDateValue(day));
      setOpen(false);
      return;
    }
    const next = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      hour,
      minute,
      0,
      0,
    );
    onChange(toDateTimeValue(next));
  };

  const applyTime = (h: number, m: number) => {
    setHour(h);
    setMinute(m);
    const base = selected ?? new Date();
    const next = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      h,
      m,
      0,
      0,
    );
    onChange(toDateTimeValue(next));
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div ref={rootRef} className={`relative space-y-2 ${className}`}>
      {label ? (
        <label className="block text-sm text-white/70">{label}</label>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-left text-sm text-white outline-none transition hover:border-white/30 focus:border-white/40 disabled:opacity-40"
      >
        <span className={value ? "text-white" : "text-white/40"}>
          {formatDisplay(value, mode)}
        </span>
        <span className="label-mono text-[0.58rem] text-white/35">
          {mode === "date" ? "Data" : "Data · godz."}
        </span>
      </button>

      {open && panelStyle ? (
        <Portal>
        <div
          ref={popoverRef}
          className="fixed z-[90] max-h-[min(85vh,calc(100dvh-1rem))] overflow-y-auto overscroll-contain rounded-2xl border border-white/12 bg-[#0a0a0a] p-3 shadow-2xl"
          style={{
            top: panelStyle.top,
            left: panelStyle.left,
            width: panelStyle.width,
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              className="rounded-full border border-white/15 px-2.5 py-1 text-sm text-white/70 hover:text-white"
              onClick={() =>
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
                )
              }
              aria-label="Poprzedni miesiąc"
            >
              ←
            </button>
            <p className="label-mono capitalize text-white/70">{monthLabel}</p>
            <button
              type="button"
              className="rounded-full border border-white/15 px-2.5 py-1 text-sm text-white/70 hover:text-white"
              onClick={() =>
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
                )
              }
              aria-label="Następny miesiąc"
            >
              →
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5 text-center font-mono text-[0.58rem] uppercase tracking-[0.12em] text-white/35">
            {WEEK.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {weeks.flat().map((day) => {
              const inMonth = day.getMonth() === cursor.getMonth();
              const key = toDateValue(day);
              const isSelected =
                selected && toDateValue(selected) === key;
              const isToday = toDateValue(new Date()) === key;
              return (
                <button
                  key={key + String(day.getTime())}
                  type="button"
                  onClick={() => pickDay(day)}
                  className={`aspect-square rounded-lg text-sm transition ${
                    isSelected
                      ? "bg-white font-medium text-black"
                      : isToday
                        ? "border border-white/25 text-white"
                        : inMonth
                          ? "text-white/85 hover:bg-white/10"
                          : "text-white/25 hover:bg-white/5"
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {mode === "datetime" ? (
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="label-mono mb-2 text-white/45">Godzina</p>
              <div className="flex gap-2">
                <select
                  value={hour}
                  onChange={(e) =>
                    applyTime(Number(e.target.value), minute)
                  }
                  className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
                >
                  {hours.map((h) => (
                    <option key={h} value={h}>
                      {pad(h)}
                    </option>
                  ))}
                </select>
                <span className="self-center text-white/40">:</span>
                <select
                  value={minute}
                  onChange={(e) => applyTime(hour, Number(e.target.value))}
                  className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
                >
                  {minutes.map((m) => (
                    <option key={m} value={m}>
                      {pad(m)}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                className="mt-3 w-full"
                onClick={() => setOpen(false)}
              >
                Gotowe
              </Button>
            </div>
          ) : null}

          <div className="mt-3 flex gap-2 border-t border-white/10 pt-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                const now = new Date();
                if (mode === "date") onChange(toDateValue(now));
                else onChange(toDateTimeValue(now));
                setOpen(false);
              }}
            >
              Dziś
            </Button>
            {allowClear ? (
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Wyczyść
              </Button>
            ) : null}
          </div>
        </div>
        </Portal>
      ) : null}
    </div>
  );
}
