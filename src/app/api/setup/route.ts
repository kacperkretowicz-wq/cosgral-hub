import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";

const SUPABASE_URL = "https://bduwbnnvhahtcjjxaazv.supabase.co";
const PROJECT_REF = "bduwbnnvhahtcjjxaazv";

/** Legacy local bootstrap — disabled on production hosts. Admin only. */
export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  return NextResponse.json(
    {
      error:
        "Ten endpoint jest wyłączony. Użyj /admin/setup → migracje + konta admin.",
    },
    { status: 410 },
  );
}

export async function GET() {
  const { isSupabaseConfigured } = await import("@/lib/db");
  const { getDbMode } = await import("@/lib/persistence");
  return NextResponse.json({
    configured: isSupabaseConfigured(),
    dbMode: getDbMode(),
    url: SUPABASE_URL,
    projectRef: PROJECT_REF,
  });
}
