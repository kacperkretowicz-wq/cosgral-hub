"use client";

import { useEffect, useRef, type ReactNode } from "react";

const VARIANTS = {
  www: { src: "/cosgral/services/strony.mp4", label: "Strony internetowe" },
  apps: { src: "/cosgral/services/aplikacje.mp4", label: "Aplikacje" },
  seo: { src: "/cosgral/services/pozycjonowanie-seo.mp4", label: "SEO & GEO" },
  auto: { src: "/cosgral/services/automatyzacje.mp4", label: "Automatyzacje" },
  crm: { src: "/cosgral/services/crm.mp4", label: "Systemy CRM" },
  grafika: { src: "/cosgral/services/grafika-montaz.mp4", label: "Grafika i montaż" },
  a: { src: "/cosgral/services/crm.mp4", label: "CRM" },
  b: { src: "/cosgral/services/aplikacje.mp4", label: "Aplikacje" },
  c: { src: "/cosgral/services/grafika-montaz.mp4", label: "Grafika" },
  d: { src: "/cosgral/services/automatyzacje.mp4", label: "Automatyzacje" },
} as const;

export type DigitalVariant = keyof typeof VARIANTS;

interface DigitalFieldProps {
  variant?: DigitalVariant;
  className?: string;
  veil?: number;
  priority?: boolean;
  alt?: string;
}

/** Service-loop plate from cosgral.pl materials. Plays only when visible. */
export function DigitalField({
  variant = "crm",
  className = "",
  veil = 35,
}: DigitalFieldProps) {
  const media = VARIANTS[variant];
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={`relative overflow-hidden rounded-[1.15rem] bg-black ${className}`}
    >
      <video
        ref={ref}
        className="absolute inset-0 h-full w-full object-cover grayscale contrast-[1.05] brightness-[0.82]"
        src={media.src}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(180deg, rgba(3,3,3,${veil / 280}) 0%, rgba(3,3,3,${veil / 110}) 100%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
    </div>
  );
}

interface DigitalHeroProps {
  title: string;
  description?: string;
  variant?: DigitalVariant;
  children?: ReactNode;
}

export function DigitalHero({
  title,
  description,
  variant = "apps",
  children,
}: DigitalHeroProps) {
  return (
    <section className="surface grid overflow-hidden p-0 md:grid-cols-2">
      <DigitalField
        variant={variant}
        className="min-h-[180px] rounded-none md:min-h-[260px]"
        veil={22}
      />
      <div className="flex flex-col justify-center gap-4 p-5 md:p-8">
        <p className="label-mono">Cosgral agency</p>
        <h2 className="display-title text-3xl text-white md:text-4xl">{title}</h2>
        {description ? (
          <p className="max-w-md text-sm leading-relaxed text-white/50">
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </section>
  );
}