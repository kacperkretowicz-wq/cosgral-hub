import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { ensurePortalSlug, getCrmClientById } from "@/lib/portal-db";
import { z } from "zod";

const schema = z.object({ crm_client_id: z.string().uuid() });

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Brak crm_client_id" }, { status: 400 });
  }

  const client = await getCrmClientById(parsed.data.crm_client_id);
  if (!client) {
    return NextResponse.json({ error: "Klient nie znaleziony" }, { status: 404 });
  }

  const slug = await ensurePortalSlug(client.id, client.company_name);
  return NextResponse.json({ slug });
}
