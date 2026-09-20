import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addMessage,
  corsHeaders,
  findThreadByVisitor,
  getMessages,
  getOrCreateThread,
  notifyTelegram,
  purgeOldSiteChat,
} from "@/lib/site-chat";

const postSchema = z.object({
  visitor_key: z.string().min(8).max(80),
  body: z.string().min(1).max(2000),
  page_url: z.string().max(500).optional(),
});

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

/** Public: visitor sends a message (creates thread if needed). */
export async function POST(request: Request) {
  const headers = corsHeaders(request);
  try {
    const json = await request.json();
    const parsed = postSchema.parse(json);
    const ua = request.headers.get("user-agent") ?? "";
    const thread = await getOrCreateThread({
      visitor_key: parsed.visitor_key,
      page_url: parsed.page_url,
      user_agent: ua,
    });
    const message = await addMessage({
      thread_id: thread.id,
      role: "visitor",
      body: parsed.body,
    });

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    const link = appUrl
      ? `${appUrl}/agent-czat?thread=${thread.id}`
      : `/agent-czat?thread=${thread.id}`;
    await notifyTelegram(
      `💬 Nowa wiadomość z strony\n${parsed.body.slice(0, 400)}\n\nOdpowiedz: ${link}`,
    );

    return NextResponse.json(
      { thread_id: thread.id, message },
      { status: 201, headers },
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400, headers });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500, headers });
  }
}

/** Public: visitor polls messages for their thread. */
export async function GET(request: Request) {
  const headers = corsHeaders(request);
  try {
    await purgeOldSiteChat();
    const { searchParams } = new URL(request.url);
    const visitorKey = (searchParams.get("visitor_key") || "").trim().slice(0, 80);
    if (visitorKey.length < 8) {
      return NextResponse.json({ messages: [], thread_id: null }, { headers });
    }

    const thread = await findThreadByVisitor(visitorKey);
    if (!thread) {
      return NextResponse.json(
        { thread_id: null, messages: [] },
        { headers: { ...headers, "Cache-Control": "no-store" } },
      );
    }

    const messages = await getMessages(thread.id);
    return NextResponse.json(
      { thread_id: thread.id, messages },
      { headers: { ...headers, "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500, headers });
  }
}
