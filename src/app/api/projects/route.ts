import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { getIntranetDb } from "@/lib/intranet-db";

const createSchema = z.object({
  title: z.string().min(1),
  crm_client_id: z.string().uuid().nullable().optional(),
  website_client_id: z.string().uuid().nullable().optional(),
  service_type: z.enum([
    "strona_www",
    "system_crm",
    "automatyzacja_ecommerce",
    "grafika",
    "montaz_wideo",
    "kampania_meta",
    "kampania_google",
    "inne",
  ]),
  status: z
    .enum(["nowe", "w_trakcie", "oczekuje", "zakonczone", "anulowane"])
    .optional(),
  assigned_to: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  description: z.string().optional(),
});

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const service_type = searchParams.get("service_type") ?? undefined;

  try {
    const data = await getIntranetDb().getProjects({ status, service_type });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const parsed = createSchema.parse(body);
    const data = await getIntranetDb().createProject({
      title: parsed.title,
      crm_client_id: parsed.crm_client_id ?? null,
      website_client_id: parsed.website_client_id ?? null,
      service_type: parsed.service_type,
      status: parsed.status ?? "nowe",
      assigned_to: parsed.assigned_to ?? null,
      deadline: parsed.deadline ?? null,
      description: parsed.description ?? "",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
