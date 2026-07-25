import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const SESSION_COOKIE = "cosgral_admin_session";
const LOCAL_ADMIN_EMAILS = [
  "jakub.gral00@gmail.com",
  "kacper.kretowicz@op.pl",
];

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login") && !pathname.startsWith("/admin/setup")) {
    if (isSupabaseConfigured()) {
      return updateSession(request);
    }

    const session = request.cookies.get(SESSION_COOKIE)?.value;
    const isAuthed = LOCAL_ADMIN_EMAILS.includes(session ?? "");

    if (!isAuthed) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  if (pathname === "/admin/login") {
    if (isSupabaseConfigured()) {
      return updateSession(request);
    }

    const session = request.cookies.get(SESSION_COOKIE)?.value;
    if (LOCAL_ADMIN_EMAILS.includes(session ?? "")) {
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
