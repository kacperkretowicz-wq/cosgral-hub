import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { getIntranetDb } from "@/lib/intranet-db";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  crm_client_id: z.string().uuid().nullable().optional(),
  website_client_id: z.string().uuid().nullable().optional(),
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
    const data = await getIntranetDb().updateProject(id, parsed);
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
