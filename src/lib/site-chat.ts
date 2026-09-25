import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getStore } from "@netlify/blobs";

export type ChatRole = "visitor" | "agent";
export type AgentAuthor = "ai" | "human";

export type SiteChatThread = {
  id: string;
  visitor_key: string;
  page_url: string;
  user_agent: string;
  status: string;
  created_at: string;
  last_message_at: string;
  deleted_at?: string;
  last_message_preview?: string;
  last_message_role?: ChatRole;
  last_message_author?: AgentAuthor;
};

export type SiteChatMessage = {
  id: string;
  thread_id: string;
  role: ChatRole;
  /** Set when role is agent — distinguishes Cosgral AI from human replies in Hub. */
  author?: AgentAuthor;
  body: string;
  created_at: string;
};

function threadPreviewFromMessage(message: SiteChatMessage): {
  last_message_preview: string;
  last_message_role: ChatRole;
  last_message_author?: AgentAuthor;
} {
  const snippet = message.body.replace(/\s+/g, " ").trim().slice(0, 140);
  return {
    last_message_preview: snippet,
    last_message_role: message.role,
    last_message_author: message.author,
  };
}

const RETENTION_MS = 24 * 60 * 60 * 1000;
const INDEX_KEY = "index";
const TRASH_KEY = "trash";
const LOCAL_DIR = path.join(process.cwd(), "data", "site-chat");

type ThreadIndex = SiteChatThread[];

function shouldUseLocalFs(): boolean {
  if (process.env.COSGRAL_DB_MODE === "local") return true;
  if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) return false;
  if (process.env.COSGRAL_DB_MODE === "blobs") return false;
  // Local `next dev` — no Netlify Blobs context
  return process.env.NODE_ENV !== "production";
}

type KvStore = {
  getJson<T>(key: string): Promise<T | null>;
  setJson(key: string, value: unknown): Promise<void>;
  getText(key: string): Promise<string | null>;
  setText(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
};

function localStore(): KvStore {
  const fileFor = (key: string) =>
    path.join(LOCAL_DIR, `${key.replace(/[/\\]/g, "__")}.json`);

  return {
    async getJson<T>(key: string) {
      try {
        const raw = await fs.readFile(fileFor(key), "utf-8");
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    async setJson(key, value) {
      await fs.mkdir(LOCAL_DIR, { recursive: true });
      await fs.writeFile(fileFor(key), JSON.stringify(value), "utf-8");
    },
    async getText(key) {
      const data = await this.getJson<{ v: string }>(`text:${key}`);
      return data?.v ?? null;
    },
    async setText(key, value) {
      await this.setJson(`text:${key}`, { v: value });
    },
    async delete(key) {
      await fs.unlink(fileFor(key)).catch(() => undefined);
      await fs.unlink(fileFor(`text:${key}`)).catch(() => undefined);
    },
  };
}

function blobsStore(): KvStore {
  const s = getStore({ name: "site-chat", consistency: "strong" });
  return {
    async getJson<T>(key: string) {
      return ((await s.get(key, { type: "json" })) as T | null) ?? null;
    },
    async setJson(key: string, value: unknown) {
      await s.setJSON(key, value);
    },
    async getText(key: string) {
      return ((await s.get(key, { type: "text" })) as string | null) ?? null;
    },
    async setText(key: string, value: string) {
      await s.set(key, value);
    },
    async delete(key: string) {
      await s.delete(key);
    },
  };
}

function kv(): KvStore {
  return shouldUseLocalFs() ? localStore() : blobsStore();
}

function msgsKey(threadId: string) {
  return `messages:${threadId}`;
}

function threadKey(threadId: string) {
  return `thread:${threadId}`;
}

function visitorMapKey(key: string) {
  return `visitor:${key}`;
}

async function readIndex(): Promise<ThreadIndex> {
  const data = await kv().getJson<ThreadIndex>(INDEX_KEY);
  return Array.isArray(data) ? data : [];
}

async function writeIndex(index: ThreadIndex): Promise<void> {
  await kv().setJson(INDEX_KEY, index);
}

async function readTrash(): Promise<ThreadIndex> {
  const data = await kv().getJson<ThreadIndex>(TRASH_KEY);
  return Array.isArray(data) ? data : [];
}

async function writeTrash(index: ThreadIndex): Promise<void> {
  await kv().setJson(TRASH_KEY, index);
}

async function hardDeleteThread(t: SiteChatThread): Promise<void> {
  const s = kv();
  await s.delete(msgsKey(t.id));
  await s.delete(threadKey(t.id));
  await s.delete(visitorMapKey(t.visitor_key));
}

export async function purgeOldSiteChat(): Promise<void> {
  const cutoff = Date.now() - RETENTION_MS;
  const s = kv();

  const index = await readIndex();
  const keep: ThreadIndex = [];
  for (const t of index) {
    const ts = Date.parse(t.last_message_at || t.created_at);
    if (!Number.isFinite(ts) || ts >= cutoff) {
      keep.push(t);
      continue;
    }
    await hardDeleteThread(t);
  }
  if (keep.length !== index.length) await writeIndex(keep);

  const trash = await readTrash();
  const trashKeep: ThreadIndex = [];
  for (const t of trash) {
    const ts = Date.parse(t.deleted_at || t.last_message_at || t.created_at);
    if (!Number.isFinite(ts) || ts >= cutoff) {
      trashKeep.push(t);
      continue;
    }
    await hardDeleteThread(t);
  }
  if (trashKeep.length !== trash.length) await writeTrash(trashKeep);
  void s;
}

export async function getOrCreateThread(input: {
  visitor_key: string;
  page_url?: string;
  user_agent?: string;
}): Promise<SiteChatThread> {
  await purgeOldSiteChat();
  const key = input.visitor_key.trim().slice(0, 80);
  if (!key) throw new Error("Brak visitor_key");

  const s = kv();
  const existingId = await s.getText(visitorMapKey(key));
  if (existingId) {
    const existing = await s.getJson<SiteChatThread>(threadKey(existingId));
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

  await s.setJson(threadKey(row.id), row);
  await s.setText(visitorMapKey(key), row.id);
  await s.setJson(msgsKey(row.id), []);

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
  const id = await kv().getText(visitorMapKey(key));
  if (!id) return null;
  return (await kv().getJson<SiteChatThread>(threadKey(id))) ?? null;
}

export async function listThreads(): Promise<SiteChatThread[]> {
  await purgeOldSiteChat();
  const index = await readIndex();
  return [...index].sort(
    (a, b) => Date.parse(b.last_message_at) - Date.parse(a.last_message_at),
  );
}

export async function listTrash(): Promise<SiteChatThread[]> {
  await purgeOldSiteChat();
  const trash = await readTrash();
  return [...trash].sort(
    (a, b) =>
      Date.parse(b.deleted_at || b.last_message_at) -
      Date.parse(a.deleted_at || a.last_message_at),
  );
}

export async function getThread(id: string): Promise<SiteChatThread | null> {
  return (await kv().getJson<SiteChatThread>(threadKey(id))) ?? null;
}

export async function getMessages(threadId: string): Promise<SiteChatMessage[]> {
  const data = await kv().getJson<SiteChatMessage[]>(msgsKey(threadId));
  return Array.isArray(data) ? data : [];
}

export async function addMessage(input: {
  thread_id: string;
  role: ChatRole;
  body: string;
  author?: AgentAuthor;
}): Promise<SiteChatMessage> {
  const body = input.body.trim().slice(0, 2000);
  if (!body) throw new Error("Pusta wiadomość");

  const s = kv();
  const thread = await s.getJson<SiteChatThread>(threadKey(input.thread_id));
  if (!thread) throw new Error("Nie znaleziono wątku");

  const author =
    input.role === "agent"
      ? input.author === "human"
        ? "human"
        : input.author === "ai"
          ? "ai"
          : "human"
      : undefined;

  const message: SiteChatMessage = {
    id: randomUUID(),
    thread_id: input.thread_id,
    role: input.role,
    ...(author ? { author } : {}),
    body,
    created_at: new Date().toISOString(),
  };

  const prev = await s.getJson<SiteChatMessage[]>(msgsKey(input.thread_id));
  const next = [...(Array.isArray(prev) ? prev : []), message].slice(-200);
  await s.setJson(msgsKey(input.thread_id), next);

  const updated: SiteChatThread = {
    ...thread,
    last_message_at: message.created_at,
    status: "open",
    ...threadPreviewFromMessage(message),
  };
  await s.setJson(threadKey(input.thread_id), updated);

  const index = await readIndex();
  if (index.some((t) => t.id === input.thread_id)) {
    const without = index.filter((t) => t.id !== input.thread_id);
    without.unshift(updated);
    await writeIndex(without.slice(0, 200));
  }

  return message;
}

/** Persist an AI reply when the widget generated it locally (PHP fallback) or Hub timed out. */
export async function appendAiReplyForVisitor(input: {
  visitor_key: string;
  body: string;
}): Promise<SiteChatMessage | null> {
  const thread = await findThreadByVisitor(input.visitor_key);
  if (!thread || thread.status === "trashed") return null;

  const body = input.body.trim().slice(0, 2000);
  if (!body) return null;

  const existing = await getMessages(thread.id);
  const last = existing[existing.length - 1];
  if (
    last &&
    last.role === "agent" &&
    last.body === body &&
    Date.now() - Date.parse(last.created_at) < 120_000
  ) {
    return last;
  }

  return addMessage({
    thread_id: thread.id,
    role: "agent",
    author: "ai",
    body,
  });
}

export function formatThreadPreview(thread: SiteChatThread): string {
  if (thread.last_message_preview) {
    if (thread.last_message_role === "visitor") {
      return `Gość: ${thread.last_message_preview}`;
    }
    if (thread.last_message_author === "ai") {
      return `AI: ${thread.last_message_preview}`;
    }
    if (thread.last_message_role === "agent") {
      return `Ty: ${thread.last_message_preview}`;
    }
    return thread.last_message_preview;
  }
  return thread.page_url || "—";
}

/** Soft-delete: move thread into trash (hidden from inbox + visitor starts fresh). */
export async function moveThreadToTrash(threadId: string): Promise<void> {
  const s = kv();
  const thread = await s.getJson<SiteChatThread>(threadKey(threadId));
  if (!thread) throw new Error("Nie znaleziono wątku");

  const index = await readIndex();
  await writeIndex(index.filter((t) => t.id !== threadId));
  await s.delete(visitorMapKey(thread.visitor_key));

  const trashed: SiteChatThread = {
    ...thread,
    status: "trashed",
    deleted_at: new Date().toISOString(),
  };
  await s.setJson(threadKey(threadId), trashed);

  const trash = await readTrash();
  const without = trash.filter((t) => t.id !== threadId);
  without.unshift(trashed);
  await writeTrash(without.slice(0, 200));
}

export async function emptyTrash(): Promise<number> {
  const trash = await readTrash();
  for (const t of trash) {
    await hardDeleteThread(t);
  }
  await writeTrash([]);
  return trash.length;
}

/** Permanent delete (from trash or force). */
export async function permanentlyDeleteThread(threadId: string): Promise<void> {
  const s = kv();
  const thread = await s.getJson<SiteChatThread>(threadKey(threadId));
  const index = await readIndex();
  await writeIndex(index.filter((t) => t.id !== threadId));
  const trash = await readTrash();
  await writeTrash(trash.filter((t) => t.id !== threadId));
  if (thread) {
    await hardDeleteThread(thread);
  } else {
    await s.delete(msgsKey(threadId));
    await s.delete(threadKey(threadId));
  }
}

export async function notifyTelegram(text: string): Promise<void> {
  const { notifyTeam } = await import("./notify");
  await notifyTeam({ title: text });
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
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
