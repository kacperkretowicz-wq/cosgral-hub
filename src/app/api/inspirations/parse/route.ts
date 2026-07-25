import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { extractInspirationsFromText } from "@/lib/ai-inspirations";
import { parseInspirationsText } from "@/lib/inspiration-utils";

const schema = z.object({
  text: z.string().min(10),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const { text } = schema.parse(body);

    const local = parseInspirationsText(text);
    const inspirations =
      local.length > 0 ? local : await extractInspirationsFromText(text);

    return NextResponse.json({ inspirations, count: inspirations.length });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Parse failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
