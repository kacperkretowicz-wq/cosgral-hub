import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export function GlassCard({
  children,
  className = "",
  title,
  description,
}: GlassCardProps) {
  return (
    <section className={`glass rounded-[1.5rem] p-6 md:p-8 ${className}`}>
      {title && (
        <h2 className="mb-2 text-xl font-semibold tracking-tight md:text-2xl">
          {title}
        </h2>
      )}
      {description && (
        <p className="mb-6 text-sm leading-relaxed text-white/55">
          {description}
        </p>
      )}
      {children}
    </section>
  );
}
