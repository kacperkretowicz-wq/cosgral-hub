import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import {
  addMessage,
  getMessages,
  getThread,
  listThreads,
} from "@/lib/site-chat";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("thread");

  try {
    if (threadId) {
      const thread = await getThread(threadId);
      if (!thread) {
        return NextResponse.json({ error: "Nie znaleziono wątku" }, { status: 404 });
      }
      const messages = await getMessages(threadId);
      return NextResponse.json(
        { thread, messages },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const threads = await listThreads();
    return NextResponse.json(threads, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const replySchema = z.object({
  thread_id: z.string().uuid(),
  body: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const parsed = replySchema.parse(await request.json());
    const thread = await getThread(parsed.thread_id);
    if (!thread) {
      return NextResponse.json({ error: "Nie znaleziono wątku" }, { status: 404 });
    }
    const message = await addMessage({
      thread_id: parsed.thread_id,
      role: "agent",
      body: parsed.body,
    });
    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
