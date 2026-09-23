"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CosgralBrand, CosgralLogo } from "@/components/CosgralLogo";
import { CosgralAmbient } from "@/components/CosgralAmbient";
import { HubAiChat } from "@/components/HubAiChat";
import { TileScrollLift } from "@/components/TileScrollLift";
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

const MORE_ITEMS = [
  { href: "/admin", label: "Home", icon: "home" as const },
  { href: "/admin/kalendarz", label: "Kalendarz", icon: "cal" as const },
  { href: "/admin/finanse", label: "Finanse", icon: "wallet" as const },
  { href: "/admin/czat", label: "Czat strony", icon: "chat" as const },
  { href: "/admin/team", label: "Team", icon: "team" as const },
  { href: "/admin/powiadomienia", label: "Powiadomienia", icon: "bell" as const },
];

type TabIcon = "clients" | "orders" | "tasks" | "more";

const MOBILE_PRIMARY: {
  href: string;
  label: string;
  icon: TabIcon | "home";
  kind: "link" | "more";
}[] = [
  { href: "/admin", label: "Home", icon: "home", kind: "link" },
  { href: "/admin/klienci", label: "Klienci", icon: "clients", kind: "link" },
  { href: "/admin/zlecenia", label: "Zlecenia", icon: "orders", kind: "link" },
  { href: "/admin/tasks", label: "Tasks", icon: "tasks", kind: "link" },
  { href: "/admin/more", label: "Więcej", icon: "more", kind: "more" },
];

const MORE_ACTIVE_PREFIXES = [
  "/admin/kalendarz",
  "/admin/finanse",
  "/admin/czat",
  "/admin/team",
  "/admin/powiadomienia",
  "/admin/more",
  "/admin/generator",
  "/admin/leady",
  "/admin/harmonogram",
];

function NavIcon({ name, className = "" }: { name: string; className?: string }) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
  };

  switch (name) {
    case "clients":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="9.5" cy="7" r="3.5" />
          <path d="M20 8v6M17 11h6" />
        </svg>
      );
    case "orders":
      return (
        <svg {...common}>
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      );
    case "tasks":
      return (
        <svg {...common}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case "more":
      return (
        <svg {...common}>
          <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case "home":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case "cal":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...common}>
          <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16.5v-8Z" />
          <path d="M21 12h-4a2 2 0 0 0 0 4h4" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M21 12a8 8 0 0 1-11.5 7.2L3 20l1.2-5.5A8 8 0 1 1 21 12Z" />
        </svg>
      );
    case "team":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" />
          <path d="M15 19c0-2 1.5-3.5 4-3.5" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
        </svg>
      );
    case "inbox":
      return (
        <svg {...common}>
          <path d="M4 6h16v12H4V6Z" />
          <path d="M4 13h4l2 2h4l2-2h4" />
        </svg>
      );
    default:
      return null;
  }
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : href === "/admin/more"
        ? MORE_ACTIVE_PREFIXES.some((p) => pathname?.startsWith(p))
        : (pathname?.startsWith(href) ?? false);

  const activeTabIndex = useMemo(() => {
    if (moreOpen || isActive("/admin/more")) return MOBILE_PRIMARY.length - 1;
    const idx = MOBILE_PRIMARY.findIndex(
      (item) => item.kind === "link" && isActive(item.href),
    );
    return idx >= 0 ? idx : 0;
  }, [pathname, moreOpen]);

  const go = (href: string) => {
    setMoreOpen(false);
    if (href === pathname) return;
    router.push(href);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/login", { method: "DELETE" }).catch(() =>
      fetch("/api/auth/logout", { method: "POST" }),
    );
    window.location.href = "/admin/login";
  };

  return (
    <div className="relative min-h-screen pb-[max(7rem,calc(5.5rem+env(safe-area-inset-bottom)))] text-white">
      <CosgralAmbient />
      <TileScrollLift />

      {/* Desktop sidebar — xl+ */}
      <aside className="fixed left-4 top-4 z-20 hidden h-[calc(100%-2rem)] w-60 xl:flex xl:flex-col">
        <div className="glass-strong flex h-full flex-col rounded-[1.75rem] p-5">
          <Link href="/admin" className="mb-8 px-2">
            <CosgralBrand size="md" subtitle="Hub" />
          </Link>
          <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
            {DESKTOP_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={`block w-full rounded-full px-4 py-2.5 text-left text-sm transition duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isActive(item.href)
                    ? "bg-white/90 text-black shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]"
                    : "text-white/55 hover:bg-white/[0.08] hover:text-white"
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

      <header className="safe-pt relative z-10 flex items-center justify-between gap-2 px-3 pb-2 pt-3 sm:px-4 xl:hidden">
        <Link
          href="/admin"
          className="glass-pill flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5"
        >
          <CosgralLogo size="sm" />
          <span className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-white/70">
            Cosgral
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative xl:hidden">
            <HubAiChat compact />
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="glass-pill rounded-full px-3.5 py-2 text-[0.65rem]"
          >
            Wyloguj
          </Button>
        </div>
      </header>

      {/* Cosgral AI — desktop top-right */}
      <div className="pointer-events-none fixed right-6 top-5 z-[45] hidden xl:block">
        <div className="pointer-events-auto">
          <HubAiChat />
        </div>
      </div>

      <main className="relative z-10 xl:ml-[17.5rem] xl:pr-4">
        <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 md:px-8 md:py-10">{children}</div>
      </main>

      {/* More sheet */}
      {moreOpen ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            aria-label="Zamknij"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute bottom-[5.75rem] left-4 right-4 mx-auto max-w-md origin-bottom animate-[sheetIn_0.35s_var(--ease)_both]">
            <div className="glass-strong rounded-[1.75rem] p-4">
              <p className="label-mono mb-3 px-2">Więcej</p>
              <div className="grid grid-cols-3 gap-2">
                {MORE_ITEMS.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => go(item.href)}
                      className={`flex flex-col items-center gap-2 rounded-2xl px-2 py-3.5 transition duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        active
                          ? "bg-white/90 text-black"
                          : "bg-white/[0.06] text-white/80 hover:bg-white/[0.12]"
                      }`}
                    >
                      <NavIcon name={item.icon} className="h-5 w-5" />
                      <span className="text-center text-[0.68rem] font-medium leading-tight">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Liquid glass tab bar — ALWAYS visible */}
      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))]"
        aria-label="Nawigacja"
      >
        <div className="pointer-events-auto glass-pill relative mx-auto flex max-w-lg items-stretch overflow-hidden rounded-full p-1.5">
          <span
            aria-hidden
            className="absolute bottom-1.5 top-1.5 rounded-full bg-white/92 shadow-[0_8px_28px_rgba(255,255,255,0.22),0_1px_0_rgba(255,255,255,0.7)_inset] will-change-transform"
            style={{
              width: `calc((100% - 0.75rem) / ${MOBILE_PRIMARY.length})`,
              left: "0.375rem",
              transform: `translate3d(${activeTabIndex * 100}%, 0, 0)`,
              transition:
                "transform 0.62s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />

          {MOBILE_PRIMARY.map((item) => {
            const active =
              item.kind === "more"
                ? moreOpen || isActive("/admin/more")
                : !moreOpen && isActive(item.href);
            const className = `relative z-10 flex min-h-[2.85rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-full transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              active ? "text-black" : "text-white/50"
            }`;

            if (item.kind === "more") {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  className={className}
                  aria-expanded={moreOpen}
                >
                  <NavIcon name={item.icon} className="h-[1.05rem] w-[1.05rem]" />
                  <span className="text-[0.52rem] font-medium tracking-wide">
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={className}
                onClick={() => setMoreOpen(false)}
              >
                <NavIcon name={item.icon} className="h-[1.05rem] w-[1.05rem]" />
                <span className="text-[0.52rem] font-medium tracking-wide">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
