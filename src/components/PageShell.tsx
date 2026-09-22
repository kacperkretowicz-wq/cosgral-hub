import type { ReactNode } from "react";
import Link from "next/link";
import { CosgralBrand } from "@/components/CosgralLogo";
import { CosgralAmbient } from "@/components/CosgralAmbient";

interface PageShellProps {
  children: ReactNode;
  showLogo?: boolean;
  logoHref?: string;
  logoSize?: "md" | "lg" | "xl";
}

export function PageShell({
  children,
  showLogo = true,
  logoHref = "/",
  logoSize = "md",
}: PageShellProps) {
  return (
    <div className="relative min-h-screen">
      <CosgralAmbient />
      <div className="relative z-10">
        {showLogo && (
          <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8">
            <Link href={logoHref}>
              <CosgralBrand size={logoSize} subtitle="agency" />
            </Link>
          </header>
        )}
        <main className="mx-auto max-w-5xl px-6 pb-16">{children}</main>
      </div>
    </div>
  );
}
