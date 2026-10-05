import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { TEAM, isTeamMemberId } from "@/lib/team";

const SESSION_COOKIE = "cosgral_admin_session";
const ADMIN_EMAILS = TEAM.map((m) => m.email.toLowerCase());
/** Extra admins get ids like `name_a1b2c3` from idFromEmail. */
const EXTRA_ADMIN_ID = /^[a-z0-9]+_[a-f0-9]{6}$/;

function isSupabaseConfigured(): boolean {
  const mode = (process.env.COSGRAL_DB_MODE || "").toLowerCase();
  if (mode === "blobs" || mode === "local") return false;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const hasPublishable =
    key.startsWith("sb_publishable_") || key.startsWith("eyJ");
  const hasSecret =
    serviceKey.startsWith("sb_secret_") || serviceKey.startsWith("eyJ");
  return (
    url.includes("supabase.co") &&
    hasPublishable &&
    key.length > 20 &&
    hasSecret &&
    serviceKey.length > 20
  );
}

function hasLocalAdminSession(request: NextRequest): boolean {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return false;
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    // keep raw
  }
  const normalized = value.toLowerCase();
  if (isTeamMemberId(normalized)) return true;
  if (ADMIN_EMAILS.includes(normalized)) return true;
  if (EXTRA_ADMIN_ID.test(normalized)) return true;
  if (normalized.includes("@") && normalized.includes(".")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public invite accept flow
  if (pathname.startsWith("/admin/invite")) {
    return NextResponse.next();
  }

  const isAdminPath =
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login") &&
    !pathname.startsWith("/admin/setup");

  if (isAdminPath) {
    if (isSupabaseConfigured()) {
      return updateSession(request);
    }

    if (!hasLocalAdminSession(request)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  if (pathname === "/admin/login") {
    if (isSupabaseConfigured()) {
      return updateSession(request);
    }

    if (hasLocalAdminSession(request)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
