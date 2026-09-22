import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { executeHubActions, planHubActions } from "@/lib/hub-ai";

const schema = z.object({
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    const plan = await planHubActions(parsed.message, parsed.history ?? []);
    const results = await executeHubActions(plan.actions);
    const failed = results.filter((r) => !r.ok);
    const reply =
      failed.length && plan.actions.length
        ? `${plan.reply}\n\nUwaga: część akcji nie przeszła — ${failed.map((f) => f.detail).join("; ")}`
        : plan.reply;

    return NextResponse.json({
      reply,
      actions: plan.actions,
      results,
      provider: plan.provider,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
