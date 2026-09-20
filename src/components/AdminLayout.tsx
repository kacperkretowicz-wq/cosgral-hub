"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CosgralBrand, CosgralLogo } from "@/components/CosgralLogo";
import { Button } from "@/components/ui/Button";

const DESKTOP_NAV = [
  { href: "/admin", label: "Home" },
  { href: "/admin/klienci", label: "Klienci" },
  { href: "/admin/zlecenia", label: "Zlecenia" },
  { href: "/admin/tasks", label: "Tasks" },
  { href: "/admin/kalendarz", label: "Kalendarz" },
  { href: "/admin/finanse", label: "Finanse" },
  { href: "/admin/czat", label: "Czat strony" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/powiadomienia", label: "Powiadomienia" },
];

const MOBILE_PRIMARY = [
  { href: "/admin/klienci", label: "Klienci" },
  { href: "/admin/zlecenia", label: "Zlecenia" },
  { href: "/admin/tasks", label: "Tasks" },
  { href: "/admin/more", label: "Więcej" },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : href === "/admin/more"
        ? ["/admin/kalendarz", "/admin/finanse", "/admin/czat", "/admin/team", "/admin/powiadomienia", "/admin/more"].some(
            (p) => pathname?.startsWith(p),
          )
        : (pathname?.startsWith(href) ?? false);

  const handleLogout = async () => {
    await fetch("/api/auth/login", { method: "DELETE" }).catch(() =>
      fetch("/api/auth/logout", { method: "POST" }),
    );
    window.location.href = "/admin/login";
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg)] pb-24 text-[var(--ink)] md:pb-0">
      <div className="pointer-events-none fixed inset-0 grid-bg" />

      <aside className="fixed left-0 top-0 z-20 hidden h-full w-60 border-r border-white/10 bg-black/85 backdrop-blur-xl md:flex md:flex-col">
        <div className="flex h-full flex-col p-6">
          <Link href="/admin" className="mb-10">
            <CosgralBrand size="md" subtitle="Hub" />
          </Link>

          <nav className="flex-1 space-y-0.5">
            {DESKTOP_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-full px-4 py-2.5 text-sm transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isActive(item.href)
                    ? "bg-white text-black"
                    : "text-white/55 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Button variant="ghost" onClick={handleLogout} className="mt-4 w-full">
            Wyloguj
          </Button>
        </div>
      </aside>

      <header className="relative z-10 flex items-center justify-between border-b border-white/10 px-4 py-3.5 md:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <CosgralLogo size="sm" />
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-white/70">
            Cosgral
          </span>
        </Link>
        <Button variant="ghost" onClick={handleLogout} className="px-3 py-2 text-[0.65rem]">
          Wyloguj
        </Button>
      </header>

      <main className="relative z-10 md:ml-60">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">{children}</div>
      </main>

      {moreOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Zamknij"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute bottom-20 left-3 right-3 rounded-2xl border border-white/10 bg-[#0a0a0a] p-3 shadow-2xl">
            <p className="label-mono mb-2 px-2">Więcej</p>
            {[
              { href: "/admin", label: "Home" },
              { href: "/admin/kalendarz", label: "Kalendarz" },
              { href: "/admin/finanse", label: "Finanse" },
              { href: "/admin/czat", label: "Czat strony" },
              { href: "/admin/team", label: "Team" },
              { href: "/admin/powiadomienia", label: "Powiadomienia" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className="block rounded-xl px-3 py-3.5 text-sm text-white/80 hover:bg-white/5"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-black/92 backdrop-blur-xl md:hidden">
        <div className="flex safe-pb">
          {MOBILE_PRIMARY.map((item) =>
            item.href === "/admin/more" ? (
              <button
                key={item.href}
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className={`flex flex-1 flex-col items-center gap-1 py-3 font-mono text-[0.58rem] uppercase tracking-[0.12em] transition ${
                  isActive(item.href) || moreOpen ? "text-white" : "text-white/40"
                }`}
              >
                {item.label}
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={`flex flex-1 flex-col items-center gap-1 py-3 font-mono text-[0.58rem] uppercase tracking-[0.12em] transition ${
                  isActive(item.href) ? "text-white" : "text-white/40"
                }`}
              >
                {item.label}
              </Link>
            ),
          )}
        </div>
      </nav>
    </div>
  );
}
