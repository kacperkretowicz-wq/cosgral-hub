import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";

const schema = z.object({
  token: z.string(),
  submissions: z.array(
    z.object({
      section_key: z.string(),
      field_key: z.string(),
      text_content: z.string(),
    }),
  ),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, submissions } = schema.parse(body);
    const db = getDb();

    const client = await db.getClientByToken(token);
    if (!client) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    await db.upsertSubmissions(client.id, submissions);
    await db.updateClient(client.id, { status: "submitted" });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  try {
    const db = getDb();
    const data = await db.getSubmissionsByToken(token);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
