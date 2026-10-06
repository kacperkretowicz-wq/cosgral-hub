import { createHash, randomBytes } from "crypto";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import { TEAM } from "@/lib/team";

const USERS_FILE = "admin_users.json";
const INVITES_FILE = "admin_invites.json";

export type AdminUserRecord = {
  id: string;
  email: string;
  label: string;
  /** Optional local fallback password (invite accept / bootstrap). */
  localPassword?: string;
  createdAt: string;
  invitedBy?: string;
};

export type AdminInviteRecord = {
  token: string;
  email: string;
  label: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
};

type UsersStore = { users: AdminUserRecord[] };
type InvitesStore = { invites: AdminInviteRecord[] };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function labelFromEmail(email: string): string {
  const local = email.split("@")[0] || "User";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function idFromEmail(email: string): string {
  const base = normalizeEmail(email)
    .split("@")[0]
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase()
    .slice(0, 20);
  const hash = createHash("sha1").update(normalizeEmail(email)).digest("hex").slice(0, 6);
  return `${base || "user"}_${hash}`;
}

export function isCoreTeamEmail(email: string): boolean {
  const n = normalizeEmail(email);
  return TEAM.some((m) => m.email.toLowerCase() === n);
}

export async function listExtraAdminUsers(): Promise<AdminUserRecord[]> {
  const store = await readJsonStore<UsersStore>(USERS_FILE, { users: [] });
  return Array.isArray(store.users) ? store.users : [];
}

export async function listAllAdminEmails(): Promise<string[]> {
  const extras = await listExtraAdminUsers();
  const set = new Set<string>([
    ...TEAM.map((m) => m.email.toLowerCase()),
    ...extras.map((u) => normalizeEmail(u.email)),
  ]);
  return [...set];
}

export async function listAdminSessionIds(): Promise<string[]> {
  const extras = await listExtraAdminUsers();
  return [
    ...TEAM.map((m) => m.id),
    ...extras.map((u) => u.id),
  ];
}

export async function findAdminByEmail(
  email: string,
): Promise<{ id: string; email: string; label: string; localPassword?: string } | null> {
  const n = normalizeEmail(email);
  const core = TEAM.find((m) => m.email.toLowerCase() === n);
  if (core) {
    return { id: core.id, email: core.email.toLowerCase(), label: core.label };
  }
  const extras = await listExtraAdminUsers();
  const hit = extras.find((u) => normalizeEmail(u.email) === n);
  return hit
    ? {
        id: hit.id,
        email: normalizeEmail(hit.email),
        label: hit.label,
        localPassword: hit.localPassword,
      }
    : null;
}

export async function findAdminBySessionValue(
  raw: string,
): Promise<{ id: string; email: string; label: string } | null> {
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    // keep
  }
  const normalized = value.toLowerCase();
  const core = TEAM.find((m) => m.id === normalized || m.email.toLowerCase() === normalized);
  if (core) {
    return { id: core.id, email: core.email.toLowerCase(), label: core.label };
  }
  const extras = await listExtraAdminUsers();
  const hit = extras.find(
    (u) => u.id === normalized || normalizeEmail(u.email) === normalized,
  );
  return hit
    ? { id: hit.id, email: normalizeEmail(hit.email), label: hit.label }
    : null;
}

export async function isRegisteredAdminEmail(email: string): Promise<boolean> {
  return Boolean(await findAdminByEmail(email));
}

async function saveUsers(users: AdminUserRecord[]) {
  await writeJsonStore<UsersStore>(USERS_FILE, { users });
}

export async function upsertAdminUser(
  input: Omit<AdminUserRecord, "createdAt"> & { createdAt?: string },
): Promise<AdminUserRecord> {
  const email = normalizeEmail(input.email);
  const users = await listExtraAdminUsers();
  const next: AdminUserRecord = {
    id: input.id || idFromEmail(email),
    email,
    label: input.label || labelFromEmail(email),
    localPassword: input.localPassword,
    createdAt: input.createdAt || new Date().toISOString(),
    invitedBy: input.invitedBy,
  };
  const idx = users.findIndex((u) => normalizeEmail(u.email) === email);
  if (idx >= 0) users[idx] = { ...users[idx], ...next };
  else users.push(next);
  await saveUsers(users);
  return next;
}

export async function removeAdminUser(email: string): Promise<{ ok: boolean; error?: string }> {
  const n = normalizeEmail(email);
  if (isCoreTeamEmail(n)) {
    return { ok: false, error: "Nie można usunąć konta założyciela (Jakub / Kacper)." };
  }
  const users = await listExtraAdminUsers();
  const next = users.filter((u) => normalizeEmail(u.email) !== n);
  if (next.length === users.length) {
    return { ok: false, error: "Nie znaleziono użytkownika o tym mailu." };
  }
  await saveUsers(next);
  return { ok: true };
}

export async function listInvites(): Promise<AdminInviteRecord[]> {
  const store = await readJsonStore<InvitesStore>(INVITES_FILE, { invites: [] });
  const now = Date.now();
  return (store.invites || []).filter((i) => Date.parse(i.expiresAt) > now);
}

async function saveInvites(invites: AdminInviteRecord[]) {
  await writeJsonStore<InvitesStore>(INVITES_FILE, { invites });
}

export async function createInvite(input: {
  email: string;
  invitedBy: string;
  label?: string;
}): Promise<AdminInviteRecord> {
  const email = normalizeEmail(input.email);
  const invites = await listInvites();
  const filtered = invites.filter((i) => normalizeEmail(i.email) !== email);
  const token = randomBytes(24).toString("hex");
  const record: AdminInviteRecord = {
    token,
    email,
    label: input.label || labelFromEmail(email),
    invitedBy: input.invitedBy,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
  };
  filtered.push(record);
  await saveInvites(filtered);
  return record;
}

export async function getInvite(token: string): Promise<AdminInviteRecord | null> {
  const invites = await listInvites();
  return invites.find((i) => i.token === token) ?? null;
}

export async function consumeInvite(token: string): Promise<AdminInviteRecord | null> {
  const store = await readJsonStore<InvitesStore>(INVITES_FILE, { invites: [] });
  const invites = store.invites || [];
  const idx = invites.findIndex((i) => i.token === token);
  if (idx < 0) return null;
  const [record] = invites.splice(idx, 1);
  await saveInvites(invites);
  if (Date.parse(record.expiresAt) <= Date.now()) return null;
  return record;
}

/** Anuluj oczekujące zaproszenie po e-mailu (niezależnie od tokena). */
export async function removeInvite(
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  const n = normalizeEmail(email);
  const store = await readJsonStore<InvitesStore>(INVITES_FILE, { invites: [] });
  const invites = store.invites || [];
  const next = invites.filter((i) => normalizeEmail(i.email) !== n);
  if (next.length === invites.length) {
    return { ok: false, error: "Nie znaleziono zaproszenia dla tego maila." };
  }
  await saveInvites(next);
  return { ok: true };
}
