import webpush from "web-push";
import {
  listPushSubscriptions,
  removePushEndpoints,
  type StoredPushSubscription,
} from "@/lib/push-store";

export type PushNotifyPayload = {
  title: string;
  body?: string;
  href?: string;
};

function notifyBaseUrl(): string {
  return (
    process.env.COSGRAL_NOTIFY_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");
}

function hubLink(path: string): string {
  const base = notifyBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

function vapidPublic(): string {
  return (
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
    process.env.VAPID_PUBLIC_KEY?.trim() ||
    ""
  );
}

function vapidPrivate(): string {
  return process.env.VAPID_PRIVATE_KEY?.trim() || "";
}

function vapidSubject(): string {
  return (
    process.env.VAPID_SUBJECT?.trim() ||
    "mailto:kontakt@cosgral.pl"
  );
}

export function isWebPushConfigured(): boolean {
  return Boolean(vapidPublic() && vapidPrivate());
}

export function getVapidPublicKey(): string | null {
  const key = vapidPublic();
  return key || null;
}

let configured = false;

function ensureWebPush() {
  if (configured) return true;
  const pub = vapidPublic();
  const priv = vapidPrivate();
  if (!pub || !priv) return false;
  webpush.setVapidDetails(vapidSubject(), pub, priv);
  configured = true;
  return true;
}

type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

function toPushPayload(payload: PushNotifyPayload): PushPayload {
  return {
    title: payload.title.slice(0, 80),
    body: (payload.body || "").trim().slice(0, 180) || "Cosgral Hub",
    url: payload.href ? hubLink(payload.href) : hubLink("/admin"),
    tag: payload.href || "cosgral-hub",
  };
}

async function sendOne(
  sub: StoredPushSubscription,
  data: PushPayload,
): Promise<"ok" | "gone" | "fail"> {
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: sub.keys,
      },
      JSON.stringify(data),
      {
        TTL: 60 * 60 * 12,
        urgency: "high",
      },
    );
    return "ok";
  } catch (err) {
    const status =
      err && typeof err === "object" && "statusCode" in err
        ? Number((err as { statusCode?: number }).statusCode)
        : 0;
    if (status === 404 || status === 410) return "gone";
    return "fail";
  }
}

/** Push to every registered iPhone / browser subscription. */
export async function sendWebPush(payload: PushNotifyPayload): Promise<{
  sent: number;
  removed: number;
}> {
  if (!ensureWebPush()) return { sent: 0, removed: 0 };

  const subs = await listPushSubscriptions();
  if (!subs.length) return { sent: 0, removed: 0 };

  const data = toPushPayload(payload);
  const results = await Promise.all(subs.map((s) => sendOne(s, data)));
  const gone = subs
    .filter((_, i) => results[i] === "gone")
    .map((s) => s.endpoint);
  await removePushEndpoints(gone);

  return {
    sent: results.filter((r) => r === "ok").length,
    removed: gone.length,
  };
}
