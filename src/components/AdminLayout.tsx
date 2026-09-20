"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CosgralBrand, CosgralLogo } from "@/components/CosgralLogo";
import { Button } from "@/components/ui/Button";

const NAV = [
  { href: "/admin", label: "Home", icon: "⌂" },
  { href: "/admin/harmonogram", label: "Tydzień", icon: "▦" },
  { href: "/admin/zlecenia", label: "Zlecenia", icon: "◫" },
  { href: "/admin/leady", label: "Leady", icon: "◉" },
  { href: "/admin/czat", label: "Czat", icon: "💬" },
  { href: "/admin/klienci", label: "Klienci", icon: "◎" },
  { href: "/admin/finanse", label: "Kasa", icon: "◈" },
  { href: "/admin/generator", label: "Oferta", icon: "✦" },
];

const MOBILE_NAV = NAV.filter((item) => item.href !== "/admin/finanse");

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : (pathname?.startsWith(href) ?? false);

  const handleLogout = async () => {
    await fetch("/api/auth/login", { method: "DELETE" }).catch(() =>
      fetch("/api/auth/logout", { method: "POST" }),
    );
    window.location.href = "/admin/login";
  };

  return (
    <div className="relative min-h-screen bg-black pb-20 md:pb-0">
      <div className="pointer-events-none fixed inset-0 grid-bg glow-center" />

      <aside className="fixed left-0 top-0 z-20 hidden h-full w-56 border-r border-white/10 bg-black/80 backdrop-blur-xl md:block">
        <div className="flex h-full flex-col p-6">
          <Link href="/admin" className="mb-8">
            <CosgralBrand size="md" subtitle="Hub" />
          </Link>

          <nav className="flex-1 space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition ${
                  isActive(item.href)
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/admin/setup"
            className={`mb-3 block rounded-sm px-3 py-2 text-xs transition ${
              isActive("/admin/setup")
                ? "bg-white/10 text-white"
                : "text-white/35 hover:bg-white/5 hover:text-white/70"
            }`}
          >
            Setup / migracje
          </Link>

          <Button variant="ghost" onClick={handleLogout} className="w-full">
            Wyloguj
          </Button>
        </div>
      </aside>

      <header className="relative z-10 flex items-center justify-between border-b border-white/10 px-4 py-4 md:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <CosgralLogo size="sm" />
          <span className="text-sm font-bold">Cosgral Hub</span>
        </Link>
        <Button variant="ghost" onClick={handleLogout} className="px-3 py-2 text-xs">
          Wyloguj
        </Button>
      </header>

      <main className="relative z-10 md:ml-56">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
          {children}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-black/90 backdrop-blur-xl md:hidden">
        <div className="flex">
          {MOBILE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition ${
                isActive(item.href) ? "text-white" : "text-white/40"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
