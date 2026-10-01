import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_session")?.value;

  // Nullify session_token in portal_auth if present
  if (token) {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    await db
      .from("portal_auth")
      .update({ session_token: null, session_expires_at: null })
      .eq("session_token", token);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("portal_session", "", {
    path: "/",
    maxAge: 0,
    httpOnly: false,
    sameSite: "lax",
  });
  return res;
}
