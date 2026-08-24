import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { TEAM } from "@/lib/team";

const SESSION_COOKIE = "cosgral_admin_session";
const ADMIN_EMAILS = TEAM.map((m) => m.email.toLowerCase());

function isSupabaseConfigured(): boolean {
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
  let session = raw.toLowerCase();
  try {
    session = decodeURIComponent(raw).toLowerCase();
  } catch {
    // keep raw
  }
  return ADMIN_EMAILS.includes(session);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPath =
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login") &&
    !pathname.startsWith("/admin/setup");

  if (isAdminPath) {
    if (isSupabaseConfigured()) {
      // updateSession also accepts local session cookie as fallback
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
