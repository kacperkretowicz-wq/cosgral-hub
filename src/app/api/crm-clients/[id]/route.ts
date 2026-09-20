import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { getIntranetDb } from "@/lib/intranet-db";

const updateSchema = z.object({
  company_name: z.string().min(1).optional(),
  contact_name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Props) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const client = await getIntranetDb().getCrmClient(id);
  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(client);
}

export async function PATCH(request: Request, { params }: Props) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.parse(body);
    const data = await getIntranetDb().updateCrmClient(id, {
      ...parsed,
      email: parsed.email === "" ? null : parsed.email,
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

export async function DELETE(_request: Request, { params }: Props) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const intranet = getIntranetDb();
    const client = await intranet.getCrmClient(id);
    if (!client) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Remove linked projects + WWW offers so lists stay in sync
    try {
      const { getDb } = await import("@/lib/db/client");
      const db = getDb();
      const projects = await intranet.getProjects();
      for (const project of projects) {
        if (project.crm_client_id !== id) continue;
        if (project.website_client_id) {
          try {
            await db.deleteClient(project.website_client_id);
          } catch {
            // offer may already be gone
          }
        }
        await intranet.deleteProject(project.id);
      }
    } catch {
      // continue with CRM delete
    }

    await intranet.deleteCrmClient(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
