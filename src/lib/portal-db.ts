/**
 * portal-db.ts
 * Supabase data-access helpers for the Client Portal (shared drive).
 */

import { createClient } from "@supabase/supabase-js";

export interface PortalAccessRequest {
  id: string;
  crm_client_id: string;
  requester_name: string;
  requester_email: string;
  status: "pending" | "approved" | "rejected";
  token: string;
  created_at: string;
  updated_at: string;
}

export interface PortalFile {
  id: string;
  crm_client_id: string;
  file_name: string;
  mime_type: string;
  /** Supabase Storage path (legacy) or empty string when storage_provider=gdrive */
  storage_path: string;
  public_url: string | null;
  uploaded_by: "admin" | "client";
  uploader_name: string | null;
  size_bytes: number;
  created_at: string;
  /** Google Drive file ID — present when storage_provider = 'gdrive' */
  gdrive_file_id?: string | null;
  /** Google Drive parent folder ID */
  gdrive_folder_id?: string | null;
  /** 'supabase' (legacy) or 'gdrive' (new default) */
  storage_provider?: "supabase" | "gdrive";
}

export interface PortalNote {
  id: string;
  crm_client_id: string;
  content: string;
  author: "admin" | "client";
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortalMessage {
  id: string;
  crm_client_id: string;
  sender: "admin" | "client";
  sender_name: string;
  content: string;
  created_at: string;
}

export interface PortalClientSummary {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  portal_slug: string | null;
  file_count: number;
  pending_requests: number;
  last_activity: string | null;
}

function db() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://bduwbnnvhahtcjjxaazv.supabase.co";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-key-pending-configuration";

  return createClient(url, key);
}

// ── Slug helpers ────────────────────────────────────────────────────────────

/** Get or generate portal_slug for a crm_client row.
 *  Used when a client was created before migration 014 ran. */
export async function ensurePortalSlug(
  clientId: string,
  companyName: string,
): Promise<string> {
  const supabase = db();
  const { data } = await supabase
    .from("crm_clients")
    .select("portal_slug")
    .eq("id", clientId)
    .single();
  if (data?.portal_slug) return data.portal_slug as string;

  // Generate slug
  const base = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 6);
  const slug = `${base || "klient"}-${suffix}`;

  await supabase
    .from("crm_clients")
    .update({ portal_slug: slug })
    .eq("id", clientId);
  return slug;
}

// ── Client listings ─────────────────────────────────────────────────────────

export async function listPortalClients(): Promise<PortalClientSummary[]> {
  const supabase = db();

  // Try with portal_slug first; if column doesn't exist yet (migration pending)
  // fall back to query without it so clients still load.
  let clientsRes = await supabase
    .from("crm_clients")
    .select("id, company_name, contact_name, email, portal_slug, updated_at")
    .order("company_name");

  const missingColumn =
    clientsRes.error &&
    (clientsRes.error.message?.includes("portal_slug") ||
      clientsRes.error.code === "42703" ||
      clientsRes.error.message?.includes("column") ||
      clientsRes.error.message?.includes("does not exist"));

  if (missingColumn) {
    // Migration 014 not yet applied — fetch without portal_slug
    clientsRes = await supabase
      .from("crm_clients")
      .select("id, company_name, contact_name, email, updated_at")
      .order("company_name") as typeof clientsRes;
  } else if (clientsRes.error) {
    throw new Error(clientsRes.error.message);
  }

  // Portal tables may not exist yet either — handle gracefully
  const [filesRes, requestsRes] = await Promise.all([
    supabase.from("portal_files").select("crm_client_id, created_at").then(
      (r) => (r.error ? { data: [] } : r),
    ),
    supabase.from("portal_access_requests").select("crm_client_id, status, created_at").then(
      (r) => (r.error ? { data: [] } : r),
    ),
  ]);

  const clients = clientsRes.data ?? [];
  const files = (filesRes.data ?? []) as { crm_client_id: string; created_at: string }[];
  const requests = (requestsRes.data ?? []) as { crm_client_id: string; status: string; created_at: string }[];

  return clients.map((c) => {
    const clientFiles = files.filter((f) => f.crm_client_id === c.id);
    const pendingReqs = requests.filter(
      (r) => r.crm_client_id === c.id && r.status === "pending",
    ).length;
    const fileDate = clientFiles.reduce<string | null>((max, f) => {
      if (!max || f.created_at > max) return f.created_at;
      return max;
    }, null);
    return {
      id: c.id,
      company_name: (c as { company_name: string }).company_name,
      contact_name: (c as { contact_name: string | null }).contact_name ?? null,
      email: (c as { email: string | null }).email ?? null,
      portal_slug: (c as { portal_slug?: string | null }).portal_slug ?? null,
      file_count: clientFiles.length,
      pending_requests: pendingReqs,
      last_activity: fileDate ?? (c as { updated_at?: string }).updated_at ?? null,
    };
  });
}

// ── Client by slug ──────────────────────────────────────────────────────────

export async function getCrmClientBySlug(slug: string) {
  const { data, error } = await db()
    .from("crm_clients")
    .select("id, company_name, contact_name, email, phone, portal_slug")
    .eq("portal_slug", slug)
    .single();
  if (error) return null;
  return data;
}

export async function getCrmClientById(id: string) {
  const { data, error } = await db()
    .from("crm_clients")
    .select("id, company_name, contact_name, email, phone, portal_slug")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

// ── Access requests ─────────────────────────────────────────────────────────

export async function createAccessRequest(
  crm_client_id: string,
  requester_name: string,
  requester_email: string,
): Promise<PortalAccessRequest> {
  const { data, error } = await db()
    .from("portal_access_requests")
    .insert({ crm_client_id, requester_name, requester_email })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PortalAccessRequest;
}

export async function getAccessRequest(id: string): Promise<PortalAccessRequest | null> {
  const { data, error } = await db()
    .from("portal_access_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as PortalAccessRequest;
}

export async function listAccessRequests(
  crm_client_id: string,
  status?: "pending" | "approved" | "rejected",
): Promise<PortalAccessRequest[]> {
  let q = db()
    .from("portal_access_requests")
    .select("*")
    .eq("crm_client_id", crm_client_id)
    .order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as PortalAccessRequest[];
}

export async function approveAccessRequest(id: string): Promise<PortalAccessRequest> {
  const { data, error } = await db()
    .from("portal_access_requests")
    .update({ status: "approved" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PortalAccessRequest;
}

export async function rejectAccessRequest(id: string): Promise<void> {
  const { error } = await db()
    .from("portal_access_requests")
    .update({ status: "rejected" })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Validate a session token — returns the access request if approved. */
export async function validatePortalSession(
  token: string,
): Promise<{ crm_client_id: string; requester_name: string } | null> {
  // Check new portal_auth sessions first
  const { data: authRow } = await db()
    .from("portal_auth")
    .select("crm_client_id, username, session_expires_at")
    .eq("session_token", token)
    .single();

  if (authRow) {
    const expires = authRow.session_expires_at ? new Date(authRow.session_expires_at) : null;
    if (!expires || expires > new Date()) {
      return {
        crm_client_id: authRow.crm_client_id as string,
        requester_name: authRow.username as string,
      };
    }
  }

  // Fallback: legacy portal_access_requests sessions
  const { data, error } = await db()
    .from("portal_access_requests")
    .select("crm_client_id, requester_name")
    .eq("token", token)
    .eq("status", "approved")
    .single();
  if (error || !data) return null;
  return {
    crm_client_id: data.crm_client_id as string,
    requester_name: (data.requester_name as string) ?? "Klient",
  };
}

// ── Files ───────────────────────────────────────────────────────────────────

const PORTAL_STORAGE_BUCKET = "client-materials";

export async function listPortalFiles(crm_client_id: string): Promise<PortalFile[]> {
  const { data, error } = await db()
    .from("portal_files")
    .select("*")
    .eq("crm_client_id", crm_client_id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PortalFile[];
}

/** Odśwież signed URL dla plików w Supabase Storage (podgląd w adminie i portalu). */
export async function enrichPortalFilesWithUrls(
  files: PortalFile[],
): Promise<PortalFile[]> {
  const supabase = db();
  return Promise.all(
    files.map(async (f) => {
      if (f.gdrive_file_id) return f;
      if (!f.storage_path) return f;
      const { data, error } = await supabase.storage
        .from(PORTAL_STORAGE_BUCKET)
        .createSignedUrl(f.storage_path, 60 * 60 * 24 * 7);
      if (error || !data?.signedUrl) return f;
      return { ...f, public_url: data.signedUrl };
    }),
  );
}

export async function createPortalFile(
  input: Omit<PortalFile, "id" | "created_at">,
): Promise<PortalFile> {
  // Build insert payload — omit undefined optional fields so Supabase
  // uses column defaults rather than inserting NULL explicitly.
  const payload: Record<string, unknown> = {
    crm_client_id: input.crm_client_id,
    file_name: input.file_name,
    mime_type: input.mime_type,
    storage_path: input.storage_path ?? "",
    public_url: input.public_url ?? null,
    uploaded_by: input.uploaded_by,
    uploader_name: input.uploader_name ?? null,
    size_bytes: input.size_bytes,
  };
  if (input.gdrive_file_id !== undefined) payload.gdrive_file_id = input.gdrive_file_id;
  if (input.gdrive_folder_id !== undefined) payload.gdrive_folder_id = input.gdrive_folder_id;
  if (input.storage_provider !== undefined) payload.storage_provider = input.storage_provider;

  const { data, error } = await db()
    .from("portal_files")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PortalFile;
}

export async function deletePortalFile(id: string): Promise<{ storage_path: string | null; gdrive_file_id: string | null }> {
  const { data: file } = await db()
    .from("portal_files")
    .select("storage_path, gdrive_file_id")
    .eq("id", id)
    .single();

  const { error } = await db().from("portal_files").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return {
    storage_path: file?.storage_path ?? null,
    gdrive_file_id: file?.gdrive_file_id ?? null,
  };
}

// ── Notes ───────────────────────────────────────────────────────────────────

export async function listPortalNotes(crm_client_id: string): Promise<PortalNote[]> {
  const { data, error } = await db()
    .from("portal_notes")
    .select("*")
    .eq("crm_client_id", crm_client_id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PortalNote[];
}

export async function createPortalNote(
  crm_client_id: string,
  content: string,
  author: "admin" | "client",
  author_name?: string,
): Promise<PortalNote> {
  const { data, error } = await db()
    .from("portal_notes")
    .insert({ crm_client_id, content, author, author_name: author_name ?? null })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PortalNote;
}

export async function deletePortalNote(id: string): Promise<void> {
  const { error } = await db().from("portal_notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Chat messages ───────────────────────────────────────────────────────────

export async function listPortalMessages(
  crm_client_id: string,
  after?: string,
): Promise<PortalMessage[]> {
  let q = db()
    .from("portal_messages")
    .select("*")
    .eq("crm_client_id", crm_client_id)
    .order("created_at", { ascending: true })
    .limit(200);
  if (after) q = q.gt("created_at", after);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as PortalMessage[];
}

export async function createPortalMessage(
  crm_client_id: string,
  sender: "admin" | "client",
  sender_name: string,
  content: string,
): Promise<PortalMessage> {
  const { data, error } = await db()
    .from("portal_messages")
    .insert({ crm_client_id, sender, sender_name, content })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PortalMessage;
}

// ── Portal Push Notifications ─────────────────────────────────────────────

/**
 * Send a Web Push notification to all subscribed devices of a portal client.
 * Safe to call from admin actions — silently skips if push is not configured.
 */
export async function sendPortalPush(
  crm_client_id: string,
  title: string,
  body?: string,
): Promise<void> {
  try {
    const { isWebPushConfigured } = await import("@/lib/web-push");
    if (!isWebPushConfigured()) return;

    const { data: subs } = await db()
      .from("portal_push_subscriptions")
      .select("endpoint, keys_p256dh, keys_auth")
      .eq("crm_client_id", crm_client_id);

    if (!subs || subs.length === 0) return;

    const webpush = (await import("web-push")).default;
    const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";
    const priv = process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
    if (!pub || !priv) return;
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT?.trim() ?? "mailto:kontakt@cosgral.pl",
      pub,
      priv,
    );

    const payload = JSON.stringify({ title, body: body ?? "", href: "/" });
    const stale: string[] = [];

    await Promise.allSettled(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.keys_p256dh, auth: s.keys_auth } },
            payload,
          );
        } catch {
          stale.push(s.endpoint);
        }
      }),
    );

    // Remove stale subscriptions
    if (stale.length > 0) {
      await db()
        .from("portal_push_subscriptions")
        .delete()
        .in("endpoint", stale);
    }
  } catch {
    // Never throw — push is best-effort
  }
}
