import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import {
  inspirationSchema,
  normalizeInspiration,
} from "@/lib/inspiration-utils";
import { getDb } from "@/lib/db/client";

const saveSchema = z.object({
  client_id: z.string().uuid(),
  inspirations: z.array(inspirationSchema),
});

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const { client_id, inspirations } = saveSchema.parse(body);
    const db = getDb();

    const client = await db.getClientById(client_id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const normalized = inspirations.map((item) => normalizeInspiration(item));
    const data = await db.updateClient(client_id, {
      inspirations: normalized,
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
