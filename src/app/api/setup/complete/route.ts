import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/api-auth";
import { isSupabaseConfigured } from "@/lib/db";
import { ADMIN_EMAILS } from "@/lib/auth";
import { TEAM } from "@/lib/team";

const BOOTSTRAP_PASSWORDS: Record<string, string> = {
  "jakub.gral00@gmail.com": "Cosgral2026!Jakub",
  "kacper.kretowicz@op.pl": "Cosgral2026!Kacper",
};

export async function POST() {
  const auth = await requireAdmin();
  // Allow bootstrap only when no admins exist yet OR when already admin.
  // If requireAdmin fails, try service-role check: if zero matching admin users, allow once.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secret) {
    return NextResponse.json(
      { error: "Brak kluczy Supabase w env." },
      { status: 400 },
    );
  }

  const supabase = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: list } = await supabase.auth.admin.listUsers();
  const existingAdmins =
    list?.users?.filter((u) =>
      ADMIN_EMAILS.includes((u.email ?? "").toLowerCase()),
    ) ?? [];

  if ("error" in auth && existingAdmins.length > 0) {
    return auth.error;
  }

  const { error: tableError } = await supabase
    .from("clients")
    .select("id")
    .limit(1);

  const tablesExist = !tableError || tableError.code !== "PGRST205";

  const createdUsers: string[] = [];
  for (const member of TEAM) {
    const email = member.email.toLowerCase();
    const exists = existingAdmins.find(
      (u) => (u.email ?? "").toLowerCase() === email,
    );

    if (exists) {
      const password = BOOTSTRAP_PASSWORDS[email];
      if (password) {
        const { error } = await supabase.auth.admin.updateUserById(exists.id, {
          password,
          email_confirm: true,
        });
        if (error) {
          createdUsers.push(`${email} — reset błąd: ${error.message}`);
        } else {
          createdUsers.push(`${email} — hasło zresetowane`);
        }
      } else {
        createdUsers.push(`${email} — już istnieje`);
      }
      continue;
    }

    const password = BOOTSTRAP_PASSWORDS[email];
    if (!password) {
      createdUsers.push(`${email} — brak hasła bootstrap`);
      continue;
    }

    const { error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      createdUsers.push(`${email} — błąd: ${error.message}`);
    } else {
      createdUsers.push(`${email} — utworzono (zmień hasło po logowaniu)`);
    }
  }

  return NextResponse.json({
    success: true,
    configured: isSupabaseConfigured(),
    tablesExist,
    users: createdUsers,
    sqlRequired: !tablesExist,
    sqlEditorUrl:
      "https://supabase.com/dashboard/project/bduwbnnvhahtcjjxaazv/sql/new",
    message: tablesExist
      ? "Konta admin gotowe. Zaloguj się na /admin/login"
      : "Konta admin utworzone. Uruchom migracje na /admin/setup.",
  });
}

export async function GET() {
  return NextResponse.json({
    configured: isSupabaseConfigured(),
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasPublishable: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith("sb_publishable_") ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith("eyJ"),
    ),
    hasSecret: Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith("sb_secret_") ||
        process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith("eyJ"),
    ),
  });
}
