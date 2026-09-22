import { readJsonStore, writeJsonStore } from "@/lib/json-store";

const FILE = "push-subscriptions.json";

export type PushSubscriptionJSON = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type StoredPushSubscription = PushSubscriptionJSON & {
  userAgent?: string;
  created_at: string;
  updated_at: string;
};

export async function listPushSubscriptions(): Promise<StoredPushSubscription[]> {
  return readJsonStore<StoredPushSubscription[]>(FILE, []);
}

export async function upsertPushSubscription(
  sub: PushSubscriptionJSON,
  userAgent?: string,
): Promise<StoredPushSubscription> {
  const all = await listPushSubscriptions();
  const now = new Date().toISOString();
  const idx = all.findIndex((s) => s.endpoint === sub.endpoint);
  const next: StoredPushSubscription = {
    ...sub,
    userAgent: userAgent || all[idx]?.userAgent,
    created_at: all[idx]?.created_at ?? now,
    updated_at: now,
  };
  if (idx >= 0) all[idx] = next;
  else all.push(next);
  await writeJsonStore(FILE, all);
  return next;
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const all = await listPushSubscriptions();
  const next = all.filter((s) => s.endpoint !== endpoint);
  await writeJsonStore(FILE, next);
}

export async function removePushEndpoints(endpoints: string[]): Promise<void> {
  if (!endpoints.length) return;
  const drop = new Set(endpoints);
  const all = await listPushSubscriptions();
  await writeJsonStore(
    FILE,
    all.filter((s) => !drop.has(s.endpoint)),
  );
}
