"use client";

import { usePathname } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";

const BARE_PATHS = ["/admin/login", "/admin/setup", "/admin/invite"];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = BARE_PATHS.some((p) => pathname?.startsWith(p) ?? false);

  if (bare) return <>{children}</>;
  return <AdminLayout>{children}</AdminLayout>;
}
