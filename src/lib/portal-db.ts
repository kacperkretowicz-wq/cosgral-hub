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
  storage_path: string;
  public_url: string | null;
  uploaded_by: "admin" | "client";
  uploader_name: string | null;
  size_bytes: number;
  created_at: string;
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
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
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

  const [clientsRes, filesRes, requestsRes] = await Promise.all([
    supabase
      .from("crm_clients")
      .select("id, company_name, contact_name, email, portal_slug, updated_at")
      .order("company_name"),
    supabase
      .from("portal_files")
      .select("crm_client_id, created_at"),
    supabase
      .from("portal_access_requests")
      .select("crm_client_id, status, created_at"),
  ]);

  if (clientsRes.error) throw new Error(clientsRes.error.message);

  const clients = clientsRes.data ?? [];
  const files = filesRes.data ?? [];
  const requests = requestsRes.data ?? [];

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
      company_name: c.company_name,
      contact_name: c.contact_name,
      email: c.email,
      portal_slug: c.portal_slug,
      file_count: clientFiles.length,
      pending_requests: pendingReqs,
      last_activity: fileDate ?? c.updated_at ?? null,
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
): Promise<PortalAccessRequest | null> {
  const { data, error } = await db()
    .from("portal_access_requests")
    .select("*")
    .eq("token", token)
    .eq("status", "approved")
    .single();
  if (error) return null;
  return data as PortalAccessRequest;
}

// ── Files ───────────────────────────────────────────────────────────────────

export async function listPortalFiles(crm_client_id: string): Promise<PortalFile[]> {
  const { data, error } = await db()
    .from("portal_files")
    .select("*")
    .eq("crm_client_id", crm_client_id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PortalFile[];
}

export async function createPortalFile(
  input: Omit<PortalFile, "id" | "created_at">,
): Promise<PortalFile> {
  const { data, error } = await db()
    .from("portal_files")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PortalFile;
}

export async function deletePortalFile(id: string): Promise<string | null> {
  const { data: file } = await db()
    .from("portal_files")
    .select("storage_path")
    .eq("id", id)
    .single();

  const { error } = await db().from("portal_files").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return file?.storage_path ?? null;
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
