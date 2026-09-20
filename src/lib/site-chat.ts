import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

export type ChatRole = "visitor" | "agent";

export type SiteChatThread = {
  id: string;
  visitor_key: string;
  page_url: string;
  user_agent: string;
  status: string;
  created_at: string;
  last_message_at: string;
};

export type SiteChatMessage = {
  id: string;
  thread_id: string;
  role: ChatRole;
  body: string;
  created_at: string;
};

const RETENTION_HOURS = 24;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function purgeOldSiteChat(): Promise<void> {
  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000).toISOString();
  await supabase.from("site_chat_threads").delete().lt("last_message_at", cutoff);
}

export async function getOrCreateThread(input: {
  visitor_key: string;
  page_url?: string;
  user_agent?: string;
}): Promise<SiteChatThread> {
  await purgeOldSiteChat();
  const supabase = getSupabase();
  const key = input.visitor_key.trim().slice(0, 80);
  if (!key) throw new Error("Brak visitor_key");

  const existing = await supabase
    .from("site_chat_threads")
    .select("*")
    .eq("visitor_key", key)
    .maybeSingle();

  if (existing.data) return existing.data as SiteChatThread;

  const row = {
    id: uuidv4(),
    visitor_key: key,
    page_url: (input.page_url ?? "").slice(0, 500),
    user_agent: (input.user_agent ?? "").slice(0, 300),
    status: "open",
  };

  const created = await supabase.from("site_chat_threads").insert(row).select().single();
  if (created.error) throw new Error(created.error.message);
  return created.data as SiteChatThread;
}

export async function listThreads(): Promise<SiteChatThread[]> {
  await purgeOldSiteChat();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("site_chat_threads")
    .select("*")
    .order("last_message_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as SiteChatThread[];
}

export async function getThread(id: string): Promise<SiteChatThread | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("site_chat_threads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SiteChatThread) ?? null;
}

export async function findThreadByVisitor(
  visitor_key: string,
): Promise<SiteChatThread | null> {
  const key = visitor_key.trim().slice(0, 80);
  if (!key) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("site_chat_threads")
    .select("*")
    .eq("visitor_key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SiteChatThread) ?? null;
}

export async function getMessages(threadId: string): Promise<SiteChatMessage[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("site_chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as SiteChatMessage[];
}

export async function addMessage(input: {
  thread_id: string;
  role: ChatRole;
  body: string;
}): Promise<SiteChatMessage> {
  const body = input.body.trim().slice(0, 2000);
  if (!body) throw new Error("Pusta wiadomość");

  const supabase = getSupabase();
  const row = {
    id: uuidv4(),
    thread_id: input.thread_id,
    role: input.role,
    body,
  };

  const inserted = await supabase.from("site_chat_messages").insert(row).select().single();
  if (inserted.error) throw new Error(inserted.error.message);

  await supabase
    .from("site_chat_threads")
    .update({ last_message_at: new Date().toISOString(), status: "open" })
    .eq("id", input.thread_id);

  return inserted.data as SiteChatMessage;
}

export async function notifyTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.slice(0, 3500),
        disable_web_page_preview: true,
      }),
    });
  } catch {
    /* non-blocking */
  }
}

export function corsHeaders(request?: Request): HeadersInit {
  const origin = request?.headers.get("origin") || "*";
  const allowed = process.env.SITE_CHAT_ALLOWED_ORIGINS;
  let allow = "*";
  if (allowed) {
    const list = allowed.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.includes("*") || list.includes(origin)) allow = origin;
    else if (list.length) allow = list[0];
  } else if (origin && origin !== "null") {
    allow = origin;
  }
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Visitor-Key",
    "Access-Control-Max-Age": "86400",
  };
}
