import { getStore } from "@netlify/blobs";
import { randomUUID } from "crypto";

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

const RETENTION_MS = 24 * 60 * 60 * 1000;
const INDEX_KEY = "index";

type ThreadIndex = SiteChatThread[];

function store() {
  return getStore({ name: "site-chat", consistency: "strong" });
}

async function readIndex(): Promise<ThreadIndex> {
  const s = store();
  const data = (await s.get(INDEX_KEY, { type: "json" })) as ThreadIndex | null;
  return Array.isArray(data) ? data : [];
}

async function writeIndex(index: ThreadIndex): Promise<void> {
  await store().setJSON(INDEX_KEY, index);
}

function msgsKey(threadId: string) {
  return `messages:${threadId}`;
}

function threadKey(threadId: string) {
  return `thread:${threadId}`;
}

function visitorKey(key: string) {
  return `visitor:${key}`;
}

export async function purgeOldSiteChat(): Promise<void> {
  const cutoff = Date.now() - RETENTION_MS;
  const index = await readIndex();
  const keep: ThreadIndex = [];
  const s = store();

  for (const t of index) {
    const ts = Date.parse(t.last_message_at || t.created_at);
    if (!Number.isFinite(ts) || ts >= cutoff) {
      keep.push(t);
      continue;
    }
    await s.delete(msgsKey(t.id));
    await s.delete(threadKey(t.id));
    await s.delete(visitorKey(t.visitor_key));
  }

  if (keep.length !== index.length) await writeIndex(keep);
}

export async function getOrCreateThread(input: {
  visitor_key: string;
  page_url?: string;
  user_agent?: string;
}): Promise<SiteChatThread> {
  await purgeOldSiteChat();
  const key = input.visitor_key.trim().slice(0, 80);
  if (!key) throw new Error("Brak visitor_key");

  const s = store();
  const existingId = (await s.get(visitorKey(key), { type: "text" })) as string | null;
  if (existingId) {
    const existing = (await s.get(threadKey(existingId), {
      type: "json",
    })) as SiteChatThread | null;
    if (existing) return existing;
  }

  const now = new Date().toISOString();
  const row: SiteChatThread = {
    id: randomUUID(),
    visitor_key: key,
    page_url: (input.page_url ?? "").slice(0, 500),
    user_agent: (input.user_agent ?? "").slice(0, 300),
    status: "open",
    created_at: now,
    last_message_at: now,
  };

  await s.setJSON(threadKey(row.id), row);
  await s.set(visitorKey(key), row.id);
  await s.setJSON(msgsKey(row.id), []);

  const index = await readIndex();
  index.unshift(row);
  await writeIndex(index.slice(0, 200));
  return row;
}

export async function findThreadByVisitor(
  visitor_key: string,
): Promise<SiteChatThread | null> {
  await purgeOldSiteChat();
  const key = visitor_key.trim().slice(0, 80);
  if (!key) return null;
  const s = store();
  const id = (await s.get(visitorKey(key), { type: "text" })) as string | null;
  if (!id) return null;
  return ((await s.get(threadKey(id), { type: "json" })) as SiteChatThread | null) ?? null;
}

export async function listThreads(): Promise<SiteChatThread[]> {
  await purgeOldSiteChat();
  const index = await readIndex();
  return [...index].sort(
    (a, b) => Date.parse(b.last_message_at) - Date.parse(a.last_message_at),
  );
}

export async function getThread(id: string): Promise<SiteChatThread | null> {
  const data = (await store().get(threadKey(id), {
    type: "json",
  })) as SiteChatThread | null;
  return data ?? null;
}

export async function getMessages(threadId: string): Promise<SiteChatMessage[]> {
  const data = (await store().get(msgsKey(threadId), {
    type: "json",
  })) as SiteChatMessage[] | null;
  return Array.isArray(data) ? data : [];
}

export async function addMessage(input: {
  thread_id: string;
  role: ChatRole;
  body: string;
}): Promise<SiteChatMessage> {
  const body = input.body.trim().slice(0, 2000);
  if (!body) throw new Error("Pusta wiadomość");

  const s = store();
  const thread = (await s.get(threadKey(input.thread_id), {
    type: "json",
  })) as SiteChatThread | null;
  if (!thread) throw new Error("Nie znaleziono wątku");

  const message: SiteChatMessage = {
    id: randomUUID(),
    thread_id: input.thread_id,
    role: input.role,
    body,
    created_at: new Date().toISOString(),
  };

  const prev = (await s.get(msgsKey(input.thread_id), {
    type: "json",
  })) as SiteChatMessage[] | null;
  const next = [...(Array.isArray(prev) ? prev : []), message].slice(-200);
  await s.setJSON(msgsKey(input.thread_id), next);

  const updated: SiteChatThread = {
    ...thread,
    last_message_at: message.created_at,
    status: "open",
  };
  await s.setJSON(threadKey(input.thread_id), updated);

  const index = await readIndex();
  const without = index.filter((t) => t.id !== input.thread_id);
  without.unshift(updated);
  await writeIndex(without.slice(0, 200));

  return message;
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
    "Access-Control-Allow-Headers": "Content-Type, X-Visitor-Key, X-Chat-Agent-Pin",
    "Access-Control-Max-Age": "86400",
  };
}

const AGENT_COOKIE = "cg_chat_agent";

export function agentPinConfigured(): string {
  return (process.env.SITE_CHAT_AGENT_PIN || "cosgral").trim();
}

export function isAgentPinValid(pin: string | null | undefined): boolean {
  if (!pin) return false;
  return pin.trim() === agentPinConfigured();
}

export function agentCookieName() {
  return AGENT_COOKIE;
}

export function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(";");
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}
