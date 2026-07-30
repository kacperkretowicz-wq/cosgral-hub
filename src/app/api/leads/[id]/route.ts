import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { getIntranetDb } from "@/lib/intranet-db";
import { getOpsDb } from "@/lib/ops-db";

const updateSchema = z.object({
  company_name: z.string().min(1).optional(),
  contact_name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional(),
  source: z.string().optional(),
  status: z
    .enum(["nowy", "kontakt", "oferta", "wygrana", "przegrana"])
    .optional(),
  message: z.string().optional(),
  crm_client_id: z.string().uuid().nullable().optional(),
  convert_to_crm: z.boolean().optional(),
  convert_to_project: z.boolean().optional(),
  service_type: z
    .enum([
      "strona_www",
      "system_crm",
      "automatyzacja_ecommerce",
      "grafika",
      "montaz_wideo",
      "kampania_meta",
      "kampania_google",
      "inne",
    ])
    .optional(),
  assigned_to: z.string().nullable().optional(),
});

interface Props {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Props) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.parse(body);
    const ops = getOpsDb();
    const lead = await ops.getLead(id);
    if (!lead) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let crmClientId = parsed.crm_client_id ?? lead.crm_client_id;
    let projectId: string | null = null;

    if ((parsed.convert_to_crm || parsed.convert_to_project) && !crmClientId) {
      const crm = await getIntranetDb().createCrmClient({
        company_name: parsed.company_name ?? lead.company_name,
        contact_name:
          parsed.contact_name !== undefined
            ? parsed.contact_name
            : lead.contact_name,
        email:
          parsed.email === "" ? null : (parsed.email ?? lead.email),
        phone: parsed.phone !== undefined ? parsed.phone : lead.phone,
        industry: null,
        notes: lead.message || "",
      });
      crmClientId = crm.id;
    }

    if (parsed.convert_to_project && crmClientId) {
      const project = await getIntranetDb().createProject({
        title: `Zlecenie — ${parsed.company_name ?? lead.company_name}`,
        crm_client_id: crmClientId,
        website_client_id: null,
        service_type: parsed.service_type ?? "inne",
        status: "nowe",
        assigned_to: parsed.assigned_to ?? "jakub",
        deadline: null,
        description: lead.message || "",
        value_pln: null,
        cost_pln: null,
        billing_status: "wycena",
        paid_at: null,
      });
      projectId = project.id;
    }

    const nextStatus =
      parsed.status ??
      (parsed.convert_to_project ? "wygrana" : undefined) ??
      (parsed.convert_to_crm ? "kontakt" : undefined);

    const data = await ops.updateLead(id, {
      ...(parsed.company_name ? { company_name: parsed.company_name } : {}),
      ...(parsed.contact_name !== undefined
        ? { contact_name: parsed.contact_name }
        : {}),
      ...(parsed.email !== undefined
        ? { email: parsed.email === "" ? null : parsed.email }
        : {}),
      ...(parsed.phone !== undefined ? { phone: parsed.phone } : {}),
      ...(parsed.source ? { source: parsed.source } : {}),
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(parsed.message !== undefined ? { message: parsed.message } : {}),
      crm_client_id: crmClientId,
    });

    return NextResponse.json({ ...data, project_id: projectId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Props) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    await getOpsDb().deleteLead(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
