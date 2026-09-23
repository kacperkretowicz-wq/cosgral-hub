"use client";

import { isoDay, monthMatrix, WEEKDAYS_SHORT } from "@/lib/month-cal";

type EventsByDay = Record<string, string[]>;

export function MonthCal({
  year,
  month,
  eventsByDay = {},
  compact = false,
  selectedDay = null,
  onSelectDay,
}: {
  year: number;
  month: number;
  eventsByDay?: EventsByDay;
  compact?: boolean;
  selectedDay?: string | null;
  onSelectDay?: (day: string) => void;
}) {
  const weeks = monthMatrix(year, month);
  const today = isoDay(new Date());
  const interactive = Boolean(onSelectDay) && !compact;

  return (
    <div className={compact ? "month-cal month-cal-compact" : "month-cal"}>
      <div className="mb-1 grid grid-cols-7 text-center font-mono text-[0.52rem] uppercase tracking-[0.12em] text-white/40 md:mb-2 md:text-[0.62rem] md:tracking-[0.14em]">
        {WEEKDAYS_SHORT.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px md:gap-1">
        {weeks.flat().map((day) => {
          const key = isoDay(day);
          const inMonth = day.getMonth() === month;
          const titles = eventsByDay[key] ?? [];
          const isToday = key === today;
          const isSelected = selectedDay === key;
          const className = [
            "month-cal-day",
            inMonth ? "in-month" : "out-month",
            isToday ? "is-today" : "",
            isSelected ? "is-selected" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const body = (
            <>
              <span className="month-cal-num">{day.getDate()}</span>
              {compact ? (
                titles.length ? (
                  <span className="month-cal-dots" aria-hidden>
                    {titles.slice(0, 3).map((_, i) => (
                      <i key={i} />
                    ))}
                  </span>
                ) : null
              ) : (
                <>
                  <span className="month-cal-titles">
                    {titles.slice(0, 3).map((title, i) => (
                      <span key={`${key}-${i}`} title={title}>
                        {title}
                      </span>
                    ))}
                  </span>
                  {titles.length ? (
                    <span className="month-cal-dots md:hidden" aria-hidden>
                      {titles.slice(0, 3).map((_, i) => (
                        <i key={i} />
                      ))}
                    </span>
                  ) : null}
                </>
              )}
            </>
          );

          if (interactive) {
            return (
              <button
                key={key + String(day.getTime())}
                type="button"
                className={className}
                onClick={() => onSelectDay?.(key)}
                aria-pressed={isSelected}
                aria-label={`${day.getDate()} ${titles.length ? titles.join(", ") : "brak wydarzeń"}`}
              >
                {body}
              </button>
            );
          }

          return (
            <div key={key + String(day.getTime())} className={className}>
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
