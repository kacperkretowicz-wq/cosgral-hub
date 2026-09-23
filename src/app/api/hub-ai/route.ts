import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { runHubAiChat } from "@/lib/hub-ai";

const schema = z.object({
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(40)
    .optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    const result = await runHubAiChat(parsed.message, parsed.history ?? []);
    const failed = result.results.filter((r) => !r.ok);
    const reply =
      failed.length && result.actions.length
        ? `${result.reply}\n\nUwaga: część akcji nie przeszła — ${failed.map((f) => f.detail).join("; ")}`
        : result.reply;

    return NextResponse.json({
      reply,
      actions: result.actions,
      results: result.results,
      provider: result.provider,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
