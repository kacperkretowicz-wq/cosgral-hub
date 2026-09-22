"use client";

export type ChartItem = {
  label: string;
  value: number;
};

const FILLS = [
  "rgba(255,255,255,0.92)",
  "rgba(255,255,255,0.62)",
  "rgba(255,255,255,0.38)",
  "rgba(255,255,255,0.22)",
  "rgba(255,255,255,0.12)",
];

function sum(items: ChartItem[]) {
  return items.reduce((s, i) => s + Math.max(0, i.value), 0);
}

export function DonutChart({
  items,
  size = 148,
  thickness = 16,
}: {
  items: ChartItem[];
  size?: number;
  thickness?: number;
}) {
  const total = sum(items) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={thickness}
        />
        {items.map((item, i) => {
          const len = (Math.max(0, item.value) / total) * c;
          const dash = `${len} ${c - len}`;
          const el = (
            <circle
              key={item.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={FILLS[i % FILLS.length]}
              strokeWidth={thickness}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <ul className="min-w-0 space-y-1.5">
        {items.map((item, i) => (
          <li
            key={item.label}
            className="flex items-center gap-2 text-[0.72rem] text-white/55"
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: FILLS[i % FILLS.length] }}
            />
            <span className="truncate">{item.label}</span>
            <span className="ml-auto tabular-nums text-white/80">
              {item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BarChart({ items }: { items: ChartItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) {
    return <p className="text-sm text-white/40">Brak danych.</p>;
  }
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[0.7rem]">
            <span className="truncate text-white/50">{item.label}</span>
            <span className="tabular-nums text-white/80">{item.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-white/80 transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
