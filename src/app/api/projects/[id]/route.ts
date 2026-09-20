import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { getIntranetDb } from "@/lib/intranet-db";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  crm_client_id: z.string().min(1).nullable().optional(),
  website_client_id: z.string().nullable().optional(),
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
  paid_at: z.string().nullable().optional(),
});

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Props) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const project = await getIntranetDb().getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}

export async function PATCH(request: Request, { params }: Props) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.parse(body);

    const patch: typeof parsed & { paid_at?: string | null } = { ...parsed };
    const settled =
      parsed.billing_status === "rozliczone" ||
      parsed.billing_status === "oplacone";
    if (settled && parsed.paid_at === undefined) {
      const existing = await getIntranetDb().getProject(id);
      if (existing && !existing.paid_at) {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, "0");
        const d = String(today.getDate()).padStart(2, "0");
        patch.paid_at = `${y}-${m}-${d}`;
      }
    }
    if (parsed.billing_status && !settled && parsed.paid_at === undefined) {
      patch.paid_at = null;
    }

    const data = await getIntranetDb().updateProject(id, patch);
    return NextResponse.json(data);
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
    const intranet = getIntranetDb();
    const project = await intranet.getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const websiteClientId = project.website_client_id;
    await intranet.deleteProject(id);

    // Remove linked WWW offer so it doesn't stay on the dashboard
    if (websiteClientId) {
      try {
        const { getDb } = await import("@/lib/db/client");
        await getDb().deleteClient(websiteClientId);
      } catch {
        // offer may already be gone
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
