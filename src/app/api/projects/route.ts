import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { getIntranetDb } from "@/lib/intranet-db";
import { assertPersistentDb, getDbMode } from "@/lib/persistence";

const createSchema = z.object({
  title: z.string().min(1),
  crm_client_id: z.string().min(1, {
    message: "Wybierz klienta CRM — zlecenie musi być do kogoś przypisane.",
  }),
  website_client_id: z.string().nullable().optional(),
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
  value_pln: z.number().nullable().optional(),
  cost_pln: z.number().nullable().optional(),
  billing_status: z
    .enum(["w_toku", "rozliczone", "wycena", "faktura", "oplacone", "anulowane"])
    .optional(),
});

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const service_type = searchParams.get("service_type") ?? undefined;
  const crm_client_id = searchParams.get("crm_client_id") ?? undefined;

  try {
    const data = await getIntranetDb().getProjects({
      status,
      service_type,
      crm_client_id,
    });
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
        "X-Cosgral-Db-Mode": getDbMode(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    assertPersistentDb("utworzenie zlecenia");
    const body = await request.json();
    const parsed = createSchema.parse(body);

    const intranet = getIntranetDb();
    const crm = await intranet.getCrmClient(parsed.crm_client_id);
    if (!crm) {
      return NextResponse.json(
        { error: "Wybrany klient CRM nie istnieje." },
        { status: 400 },
      );
    }

    const data = await intranet.createProject({
      title: parsed.title,
      crm_client_id: parsed.crm_client_id,
      website_client_id: parsed.website_client_id ?? null,
      service_type: parsed.service_type,
      status: parsed.status ?? "nowe",
      assigned_to: parsed.assigned_to ?? null,
      deadline: parsed.deadline ?? null,
      description: parsed.description ?? "",
      value_pln: parsed.value_pln ?? null,
      cost_pln: parsed.cost_pln ?? null,
      billing_status: parsed.billing_status ?? "w_toku",
      paid_at: null,
    });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const first = err.errors[0]?.message ?? "Niepoprawne dane";
      return NextResponse.json({ error: first, details: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
