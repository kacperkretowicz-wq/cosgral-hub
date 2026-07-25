import { cookies } from "next/headers";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/db";

const LOCAL_ADMINS = [
  { email: "jakub.gral00@gmail.com", password: "Cosgral2026!Jakub" },
  { email: "kacper.kretowicz@op.pl", password: "Cosgral2026!Kacper" },
];

const SESSION_COOKIE = "cosgral_admin_session";

export async function loginAdmin(
  email: string,
  password: string,
  remember = true,
): Promise<{ ok: boolean; error?: string }> {
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8;

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { ok: false, error: "Nieprawidłowy email lub hasło" };

    const cookieStore = await cookies();
    cookieStore.set("cosgral_remember", remember ? "1" : "0", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });

    return { ok: true };
  }

  const admin = LOCAL_ADMINS.find((a) => a.email === email);
  if (!admin || admin.password !== password) {
    return { ok: false, error: "Nieprawidłowy email lub hasło" };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });

  return { ok: true };
}

export async function getAdminEmail(): Promise<string | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.email ?? null;
  }

  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function logoutAdmin(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    return;
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return Boolean(user);
  }

  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  return LOCAL_ADMINS.some((a) => a.email === session);
}

export function getLocalAdminCredentials() {
  return LOCAL_ADMINS.map((a) => ({ email: a.email, password: a.password }));
}
