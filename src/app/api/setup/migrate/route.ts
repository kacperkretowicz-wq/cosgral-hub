import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import {
  buildDatabaseUrl,
  loadAllMigrationSql,
  probeSchemaHealth,
  runMigrations,
} from "@/lib/run-migrations";

const schema = z.object({
  db_password: z.string().min(1).optional(),
});

export async function GET() {
  try {
    const health = await probeSchemaHealth();
    return NextResponse.json({
      health,
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      sqlEditorUrl:
        "https://supabase.com/dashboard/project/bduwbnnvhahtcjjxaazv/sql/new",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Run all idempotent migrations. Admin only. */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = schema.parse(body);

    let connectionString = process.env.DATABASE_URL ?? "";
    if (parsed.db_password) {
      connectionString = buildDatabaseUrl(parsed.db_password);
    }

    if (!connectionString) {
      const sql = await loadAllMigrationSql();
      return NextResponse.json(
        {
          error:
            "Brak DATABASE_URL. Podaj hasło bazy (db_password) albo wklej SQL ręcznie w SQL Editorze.",
          sql,
          sqlEditorUrl:
            "https://supabase.com/dashboard/project/bduwbnnvhahtcjjxaazv/sql/new",
        },
        { status: 400 },
      );
    }

    const result = await runMigrations(connectionString);
    if (!result.ok) {
      const sql = await loadAllMigrationSql();
      return NextResponse.json(
        {
          error: result.error,
          applied: result.applied,
          sql,
          sqlEditorUrl:
            "https://supabase.com/dashboard/project/bduwbnnvhahtcjjxaazv/sql/new",
        },
        { status: 500 },
      );
    }

    const health = await probeSchemaHealth();
    return NextResponse.json({
      success: true,
      applied: result.applied,
      health,
      message: "Migracje wykonane. Cosgral OS gotowy.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
