import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getDb } from "@/lib/db/client";

interface Props {
  params: Promise<{ id: string }>;
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
