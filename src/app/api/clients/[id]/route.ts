import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { getDb } from "@/lib/db/client";

const updateSchema = z.object({
  offer_content: z
    .object({
      intro: z.string(),
      closing: z.string(),
      sections: z.array(
        z.object({
          number: z.string(),
          title: z.string(),
          items: z.array(z.string()),
        }),
      ),
    })
    .optional(),
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
    const db = getDb();
    const client = await db.getClientById(id);
    if (!client) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = await db.updateClient(id, parsed);
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
    const db = getDb();
    const client = await db.getClientById(id);
    if (!client) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.deleteClient(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
