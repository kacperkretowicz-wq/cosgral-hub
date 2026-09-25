import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import type {
  AgentAuthor,
  ChatRole,
  SiteChatMessage,
  SiteChatThread,
} from "./site-chat";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function rowToThread(row: Record<string, unknown>): SiteChatThread {
  return {
    id: String(row.id),
    visitor_key: String(row.visitor_key),
    page_url: String(row.page_url ?? ""),
    user_agent: String(row.user_agent ?? ""),
    status: String(row.status ?? "open"),
    created_at: String(row.created_at),
    last_message_at: String(row.last_message_at),
    deleted_at: row.deleted_at ? String(row.deleted_at) : undefined,
    last_message_preview: row.last_message_preview
      ? String(row.last_message_preview)
      : undefined,
    last_message_role: row.last_message_role
      ? (row.last_message_role as ChatRole)
      : undefined,
    last_message_author: row.last_message_author
      ? (row.last_message_author as AgentAuthor)
      : undefined,
  };
}

function rowToMessage(row: Record<string, unknown>): SiteChatMessage {
  const role = row.role as ChatRole;
  const author = row.author as AgentAuthor | null;
  return {
    id: String(row.id),
    thread_id: String(row.thread_id),
    role,
    ...(role === "agent" && author ? { author } : {}),
    ...(role === "agent" && !author ? {} : {}),
    body: String(row.body),
    created_at: String(row.created_at),
  };
}

function previewFromMessage(message: SiteChatMessage) {
  return {
    last_message_preview: message.body.replace(/\s+/g, " ").trim().slice(0, 140),
    last_message_role: message.role,
    last_message_author: message.author,
  };
}

const RETENTION_MS = 24 * 60 * 60 * 1000;

export async function purgeOldSiteChatSupabase(): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();
  const sb = getSupabase();
  await sb.from("site_chat_threads").delete().lt("last_message_at", cutoff);
}

export async function getOrCreateThreadSupabase(input: {
  visitor_key: string;
  page_url?: string;
  user_agent?: string;
}): Promise<SiteChatThread> {
  await purgeOldSiteChatSupabase();
  const key = input.visitor_key.trim().slice(0, 80);
  if (!key) throw new Error("Brak visitor_key");

  const sb = getSupabase();
  const { data: existing } = await sb
    .from("site_chat_threads")
    .select("*")
    .eq("visitor_key", key)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) return rowToThread(existing);

  const now = new Date().toISOString();
  const row: Record<string, string> = {
    id: randomUUID(),
    visitor_key: key,
    page_url: (input.page_url ?? "").slice(0, 500),
    user_agent: (input.user_agent ?? "").slice(0, 300),
    status: "open",
    created_at: now,
    last_message_at: now,
  };

  const { data, error } = await sb
    .from("site_chat_threads")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToThread(data);
}

export async function findThreadByVisitorSupabase(
  visitor_key: string,
): Promise<SiteChatThread | null> {
  await purgeOldSiteChatSupabase();
  const key = visitor_key.trim().slice(0, 80);
  if (!key) return null;
  const sb = getSupabase();
  const { data } = await sb
    .from("site_chat_threads")
    .select("*")
    .eq("visitor_key", key)
    .is("deleted_at", null)
    .maybeSingle();
  return data ? rowToThread(data) : null;
}

export async function listThreadsSupabase(): Promise<SiteChatThread[]> {
  await purgeOldSiteChatSupabase();
  const sb = getSupabase();
  const { data, error } = await sb
    .from("site_chat_threads")
    .select("*")
    .is("deleted_at", null)
    .order("last_message_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToThread);
}

export async function listTrashSupabase(): Promise<SiteChatThread[]> {
  await purgeOldSiteChatSupabase();
  const sb = getSupabase();
  const { data, error } = await sb
    .from("site_chat_threads")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToThread);
}

export async function getThreadSupabase(id: string): Promise<SiteChatThread | null> {
  const sb = getSupabase();
  const { data } = await sb
    .from("site_chat_threads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ? rowToThread(data) : null;
}

export async function getMessagesSupabase(
  threadId: string,
): Promise<SiteChatMessage[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("site_chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToMessage);
}

export async function addMessageSupabase(input: {
  thread_id: string;
  role: ChatRole;
  body: string;
  author?: AgentAuthor;
}): Promise<SiteChatMessage> {
  const body = input.body.trim().slice(0, 2000);
  if (!body) throw new Error("Pusta wiadomość");

  const thread = await getThreadSupabase(input.thread_id);
  if (!thread || thread.deleted_at) throw new Error("Nie znaleziono wątku");

  const author =
    input.role === "agent"
      ? input.author === "human"
        ? "human"
        : input.author === "ai"
          ? "ai"
          : "human"
      : undefined;

  const sb = getSupabase();
  const row = {
    id: randomUUID(),
    thread_id: input.thread_id,
    role: input.role,
    body,
    author: author ?? null,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from("site_chat_messages")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const message = rowToMessage(data);
  const preview = previewFromMessage(message);

  await sb
    .from("site_chat_threads")
    .update({
      last_message_at: message.created_at,
      status: "open",
      ...preview,
    })
    .eq("id", input.thread_id);

  return message;
}

export async function appendAiReplyForVisitorSupabase(input: {
  visitor_key: string;
  body: string;
}): Promise<SiteChatMessage | null> {
  const thread = await findThreadByVisitorSupabase(input.visitor_key);
  if (!thread) return null;

  const existing = await getMessagesSupabase(thread.id);
  const last = existing[existing.length - 1];
  const body = input.body.trim().slice(0, 2000);
  if (!body) return null;

  if (
    last &&
    last.role === "agent" &&
    last.body === body &&
    Date.now() - Date.parse(last.created_at) < 120_000
  ) {
    return last;
  }

  return addMessageSupabase({
    thread_id: thread.id,
    role: "agent",
    author: "ai",
    body,
  });
}

export async function moveThreadToTrashSupabase(threadId: string): Promise<void> {
  const sb = getSupabase();
  const now = new Date().toISOString();
  const { error } = await sb
    .from("site_chat_threads")
    .update({ status: "trashed", deleted_at: now })
    .eq("id", threadId);
  if (error) throw new Error(error.message);
}

export async function emptyTrashSupabase(): Promise<number> {
  const trash = await listTrashSupabase();
  const sb = getSupabase();
  for (const t of trash) {
    await sb.from("site_chat_messages").delete().eq("thread_id", t.id);
    await sb.from("site_chat_threads").delete().eq("id", t.id);
  }
  return trash.length;
}

export async function permanentlyDeleteThreadSupabase(
  threadId: string,
): Promise<void> {
  const sb = getSupabase();
  await sb.from("site_chat_messages").delete().eq("thread_id", threadId);
  await sb.from("site_chat_threads").delete().eq("id", threadId);
}
