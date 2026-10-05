import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { TEAM, isTeamMemberId } from "@/lib/team";

const ADMIN_EMAILS = TEAM.map((m) => m.email.toLowerCase());
const SESSION_COOKIE = "cosgral_admin_session";
const EXTRA_ADMIN_ID = /^[a-z0-9]+_[a-f0-9]{6}$/;

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

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let isAdmin = false;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const email = user?.email?.toLowerCase() ?? "";
    // Core team always; invited users rely on local session cookie (blobs allowlist).
    isAdmin = Boolean(user && ADMIN_EMAILS.includes(email));
  } catch {
    isAdmin = false;
  }

  if (!isAdmin && hasLocalAdminSession(request)) {
    isAdmin = true;
  }

  if (request.nextUrl.pathname.startsWith("/admin/invite")) {
    return supabaseResponse;
  }

  if (
    request.nextUrl.pathname.startsWith("/admin") &&
    !request.nextUrl.pathname.startsWith("/admin/login") &&
    !request.nextUrl.pathname.startsWith("/admin/setup") &&
    !isAdmin
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  if (request.nextUrl.pathname === "/admin/login" && isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
