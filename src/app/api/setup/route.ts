import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const schema = z.object({
  anon_key: z.string().min(20),
  service_role_key: z.string().min(20),
  db_password: z.string().min(1),
});

const SUPABASE_URL = "https://bduwbnnvhahtcjjxaazv.supabase.co";
const PROJECT_REF = "bduwbnnvhahtcjjxaazv";

const ADMINS = [
  { email: "jakub.gral00@gmail.com", password: "Cosgral2026!Jakub" },
  { email: "kacper.kretowicz@op.pl", password: "Cosgral2026!Kacper" },
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { anon_key, service_role_key, db_password } = schema.parse(body);

    const envContent = `# Supabase — skonfigurowane automatycznie
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon_key}
SUPABASE_SERVICE_ROLE_KEY=${service_role_key}
DATABASE_URL=postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(db_password)}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google Drive
GOOGLE_DRIVE_ROOT_FOLDER_ID=1r7lRmwWpgD89VlIPdybmwHXqPzMUsO6G
# GOOGLE_SERVICE_ACCOUNT_EMAIL=
# GOOGLE_PRIVATE_KEY=

# OpenAI (opcjonalnie)
# OPENAI_API_KEY=
`;

    const envPath = path.join(process.cwd(), ".env.local");
    await fs.writeFile(envPath, envContent, "utf-8");

    const migrationSql = await fs.readFile(
      path.join(process.cwd(), "supabase/migrations/001_initial_schema.sql"),
      "utf-8",
    );

    let migrationOk = false;
    let migrationError = "";

    try {
      const pg = await import("pg");
      const client = new pg.default.Client({
        connectionString: `postgresql://postgres.${PROJECT_REF}:${db_password}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
      });
      await client.connect();
      await client.query(migrationSql);
      await client.end();
      migrationOk = true;
    } catch (err) {
      migrationError =
        err instanceof Error ? err.message : "Migration failed";
    }

    const supabase = createClient(SUPABASE_URL, service_role_key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const createdUsers: string[] = [];
    for (const admin of ADMINS) {
      const { data: existing } = await supabase.auth.admin.listUsers();
      const found = existing?.users?.find((u) => u.email === admin.email);

      if (found) {
        createdUsers.push(`${admin.email} (już istnieje)`);
        continue;
      }

      const { error } = await supabase.auth.admin.createUser({
        email: admin.email,
        password: admin.password,
        email_confirm: true,
      });

      if (error) {
        createdUsers.push(`${admin.email}: ${error.message}`);
      } else {
        createdUsers.push(`${admin.email}: utworzono (hasło: ${admin.password})`);
      }
    }

    return NextResponse.json({
      success: true,
      migrationOk,
      migrationError: migrationOk ? null : migrationError,
      users: createdUsers,
      message:
        "Setup zakończony. Zrestartuj serwer: npm run dev. Zmień hasła po pierwszym logowaniu!",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const { isSupabaseConfigured } = await import("@/lib/db");
  return NextResponse.json({
    configured: isSupabaseConfigured(),
    url: SUPABASE_URL,
    projectRef: PROJECT_REF,
  });
}
