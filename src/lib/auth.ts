import { cookies } from "next/headers";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/db";
import { TEAM, type TeamMemberId, isTeamMemberId } from "@/lib/team";

/** Only these emails may use the admin panel. */
export const ADMIN_EMAILS = TEAM.map((m) => m.email.toLowerCase());

/** Team passwords — used when Supabase Auth is broken / out of sync. */
const LOCAL_ADMIN_PASSWORDS: Record<string, string> = {
  "jakub.gral00@gmail.com": "Cosgral2026!Jakub",
  "kacper.kretowicz@op.pl": "Cosgral2026!Kacper",
};

export const SESSION_COOKIE = "cosgral_admin_session";

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

function cookieSecure() {
  return process.env.NODE_ENV === "production";
}

function emailFromSessionValue(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    // keep raw
  }
  const normalized = value.toLowerCase();
  if (isTeamMemberId(normalized)) {
    return TEAM.find((m) => m.id === normalized)?.email.toLowerCase() ?? null;
  }
  if (isAdminEmail(normalized)) return normalized;
  return null;
}

async function setLocalSession(email: string, maxAge: number) {
  const member = TEAM.find((m) => m.email.toLowerCase() === email);
  // Store team id (no @) to avoid cookie encoding mismatches
  const value = member?.id ?? email;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    maxAge,
    path: "/",
  });
}

export async function loginAdmin(
  email: string,
  password: string,
  remember = true,
): Promise<{ ok: boolean; error?: string; mode?: "supabase" | "local" }> {
  const normalized = email.trim().toLowerCase();
  if (!isAdminEmail(normalized)) {
    return { ok: false, error: "Nieprawidłowy email lub hasło" };
  }

  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
  const localOk = LOCAL_ADMIN_PASSWORDS[normalized] === password;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      });

      if (!error) {
        const cookieStore = await cookies();
        cookieStore.set("cosgral_remember", remember ? "1" : "0", {
          httpOnly: true,
          secure: cookieSecure(),
          sameSite: "lax",
          maxAge,
          path: "/",
        });
        await setLocalSession(normalized, maxAge);
        return { ok: true, mode: "supabase" };
      }
    } catch {
      // Auth API unreachable — fall through to local
    }

    if (localOk) {
      await setLocalSession(normalized, maxAge);
      return { ok: true, mode: "local" };
    }

    return { ok: false, error: "Nieprawidłowy email lub hasło" };
  }

  if (!localOk) {
    return { ok: false, error: "Nieprawidłowy email lub hasło" };
  }

  await setLocalSession(normalized, maxAge);
  return { ok: true, mode: "local" };
}

export async function getAdminEmail(): Promise<string | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email?.toLowerCase() ?? null;
      if (isAdminEmail(email)) return email;
    } catch {
      // ignore — try local cookie
    }
  }

  const cookieStore = await cookies();
  return emailFromSessionValue(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  return Boolean(await getAdminEmail());
}

export function resolveLocalSessionEmail(
  raw: string | undefined | null,
): string | null {
  return emailFromSessionValue(raw);
}

export type { TeamMemberId };
