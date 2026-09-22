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
        <h1 className="display-title text-2xl text-white sm:text-3xl md:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/45 normal-case tracking-normal">
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
    <div className="surface relative overflow-visible">
      <div className="relative z-10 flex flex-col items-center justify-center px-6 py-14 text-center sm:py-16">
        <p className="label-mono mb-3">Pusto</p>
        <h3 className="display-title text-lg text-white">{title}</h3>
        {description ? (
          <p className="mt-3 max-w-sm text-sm normal-case tracking-normal text-white/45">
            {description}
          </p>
        ) : null}
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
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
    neutral: "border-white/15 bg-white/[0.05] text-white/70",
    ok: "border-white/25 bg-white/10 text-white",
    warn: "border-amber-400/30 bg-amber-400/10 text-amber-100/90",
    danger: "border-red-400/30 bg-red-400/10 text-red-200/90",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
