import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="label-mono mb-2">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/50">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
      <p className="label-mono mb-3">Pusto</p>
      <h3 className="text-lg font-medium text-white">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-white/45">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "danger";
}) {
  const tones = {
    neutral: "border-white/15 text-white/70",
    ok: "border-white/25 text-white",
    warn: "border-amber-400/30 text-amber-100/90",
    danger: "border-red-400/30 text-red-200/90",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
