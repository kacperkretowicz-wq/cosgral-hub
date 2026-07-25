import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/db";

const ADMINS = [
  { email: "jakub.gral00@gmail.com", password: "Cosgral2026!Jakub" },
  { email: "kacper.kretowicz@op.pl", password: "Cosgral2026!Kacper" },
];

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secret) {
    return NextResponse.json(
      { error: "Brak kluczy w .env.local" },
      { status: 400 },
    );
  }

  const supabase = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: tableError } = await supabase
    .from("clients")
    .select("id")
    .limit(1);

  const tablesExist = !tableError || tableError.code !== "PGRST205";

  const createdUsers: string[] = [];
  for (const admin of ADMINS) {
    const { data: list } = await supabase.auth.admin.listUsers();
    const exists = list?.users?.find((u) => u.email === admin.email);

    if (exists) {
      createdUsers.push(`${admin.email} — już istnieje`);
      continue;
    }

    const { error } = await supabase.auth.admin.createUser({
      email: admin.email,
      password: admin.password,
      email_confirm: true,
    });

    if (error) {
      createdUsers.push(`${admin.email} — błąd: ${error.message}`);
    } else {
      createdUsers.push(
        `${admin.email} — utworzono (hasło: ${admin.password})`,
      );
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
      : "Konta admin utworzone. Uruchom SQL z pliku supabase/migrations/001_initial_schema.sql w SQL Editor.",
  });
}

export async function GET() {
  return NextResponse.json({
    configured: isSupabaseConfigured(),
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasPublishable: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith("sb_publishable_"),
    ),
    hasSecret: Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith("sb_secret_"),
    ),
  });
}
