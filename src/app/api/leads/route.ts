import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { getOpsDb } from "@/lib/ops-db";
import { assertPersistentDb } from "@/lib/persistence";

const createSchema = z.object({
  company_name: z.string().min(1),
  contact_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  source: z.string().optional(),
  message: z.string().optional(),
  status: z
    .enum(["nowy", "kontakt", "oferta", "wygrana", "przegrana"])
    .optional(),
});

/** Public lead intake from website — protect with LEADS_INTAKE_SECRET */
export async function POST(request: Request) {
  try {
    assertPersistentDb("zapis leada");
    const body = await request.json();

    const secret = process.env.LEADS_INTAKE_SECRET;
    if (secret) {
      const provided =
        request.headers.get("x-leads-secret") || body.secret || "";
      if (provided !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const parsed = createSchema.parse(body);
    const data = await getOpsDb().createLead({
      company_name: parsed.company_name,
      contact_name: parsed.contact_name ?? null,
      email: parsed.email || null,
      phone: parsed.phone ?? null,
      source: parsed.source ?? "website",
      status: parsed.status ?? "nowy",
      message: parsed.message ?? "",
      crm_client_id: null,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as
    | "nowy"
    | "kontakt"
    | "oferta"
    | "wygrana"
    | "przegrana"
    | null;

  try {
    const data = await getOpsDb().getLeads(
      status ? { status } : undefined,
    );
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
