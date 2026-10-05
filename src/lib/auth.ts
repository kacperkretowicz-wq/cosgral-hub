import { cookies } from "next/headers";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/db";
import { TEAM, type TeamMemberId } from "@/lib/team";
import {
  findAdminByEmail,
  findAdminBySessionValue,
  isRegisteredAdminEmail,
} from "@/lib/admin-users-store";

/** Core team emails (static allowlist). Extra admins live in the blob store. */
export const ADMIN_EMAILS = TEAM.map((m) => m.email.toLowerCase());

/** Team passwords — used when Supabase Auth is broken / out of sync. */
const LOCAL_ADMIN_PASSWORDS: Record<string, string> = {
  "jakub.gral00@gmail.com": "Wiki100!",
  "kacper.kretowicz@op.pl": "Cosgral100!",
};

export const SESSION_COOKIE = "cosgral_admin_session";

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

function cookieSecure() {
  return process.env.NODE_ENV === "production";
}

async function setLocalSession(userId: string, maxAge: number) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
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
  const raw = email.trim().toLowerCase();
  const byLabel = TEAM.find((m) => m.label.toLowerCase() === raw || m.id === raw);
  const normalized = (byLabel?.email ?? raw).toLowerCase();

  const admin = await findAdminByEmail(normalized);
  if (!admin) {
    return { ok: false, error: "Nieprawidłowy login lub hasło" };
  }

  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
  const localOk =
    LOCAL_ADMIN_PASSWORDS[admin.email] === password ||
    (Boolean(admin.localPassword) && admin.localPassword === password);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: admin.email,
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
        await setLocalSession(admin.id, maxAge);
        return { ok: true, mode: "supabase" };
      }
    } catch {
      // Auth API unreachable — fall through to local
    }

    if (localOk) {
      await setLocalSession(admin.id, maxAge);
      return { ok: true, mode: "local" };
    }

    return { ok: false, error: "Nieprawidłowy login lub hasło" };
  }

  if (!localOk) {
    return { ok: false, error: "Nieprawidłowy login lub hasło" };
  }

  await setLocalSession(admin.id, maxAge);
  return { ok: true, mode: "local" };
}

/** Establish session after invite accept (already validated). */
export async function establishAdminSession(
  email: string,
  remember = true,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await findAdminByEmail(email);
  if (!admin) return { ok: false, error: "Konto nie istnieje" };
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
  await setLocalSession(admin.id, maxAge);
  return { ok: true };
}

export async function getAdminEmail(): Promise<string | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email?.toLowerCase() ?? null;
      if (email && (await isRegisteredAdminEmail(email))) return email;
    } catch {
      // ignore — try local cookie
    }
  }

  const cookieStore = await cookies();
  const session = await findAdminBySessionValue(
    cookieStore.get(SESSION_COOKIE)?.value ?? "",
  );
  return session?.email ?? null;
}

export async function getAdminSession(): Promise<{
  id: string;
  email: string;
  label: string;
} | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email?.toLowerCase() ?? null;
      if (email) {
        const admin = await findAdminByEmail(email);
        if (admin) return { id: admin.id, email: admin.email, label: admin.label };
      }
    } catch {
      // ignore
    }
  }

  const cookieStore = await cookies();
  return findAdminBySessionValue(cookieStore.get(SESSION_COOKIE)?.value ?? "");
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
  if (!raw) return null;
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    // keep
  }
  const normalized = value.toLowerCase();
  const core = TEAM.find(
    (m) => m.id === normalized || m.email.toLowerCase() === normalized,
  );
  return core?.email.toLowerCase() ?? (normalized.includes("@") ? normalized : null);
}

export type { TeamMemberId };
