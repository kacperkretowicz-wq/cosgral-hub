import { NextResponse } from "next/server";
import { z } from "zod";
import { appendAiReplyForVisitor, corsHeaders } from "@/lib/site-chat";

const postSchema = z.object({
  visitor_key: z.string().min(8).max(80),
  body: z.string().min(1).max(2000),
});

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

/** Public: sync AI reply into Hub history (widget PHP fallback or missed Hub AI save). */
export async function POST(request: Request) {
  const headers = corsHeaders(request);
  try {
    const parsed = postSchema.parse(await request.json());
    const agent_message = await appendAiReplyForVisitor({
      visitor_key: parsed.visitor_key,
      body: parsed.body,
    });
    if (!agent_message) {
      return NextResponse.json(
        { error: "Brak aktywnego wątku" },
        { status: 404, headers },
      );
    }
    return NextResponse.json({ agent_message }, { status: 201, headers });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400, headers });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500, headers });
  }
}
