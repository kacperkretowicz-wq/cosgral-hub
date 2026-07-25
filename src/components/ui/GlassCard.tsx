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
    <section className={`glass rounded-lg p-6 md:p-8 ${className}`}>
      {title && (
        <h2 className="mb-2 text-xl font-bold tracking-tight md:text-2xl">
          {title}
        </h2>
      )}
      {description && (
        <p className="mb-6 text-sm leading-relaxed text-white/60">
          {description}
        </p>
      )}
      {children}
    </section>
  );
}
