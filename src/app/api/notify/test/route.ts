import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import {
  isEmailConfigured,
  notifyEmailTo,
  notifyTeam,
} from "@/lib/notify";
import { listPushSubscriptions } from "@/lib/push-store";
import { isWebPushConfigured } from "@/lib/web-push";

/** POST: wyślij testowe powiadomienie (push / email / Telegram). */
export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const email = isEmailConfigured();
  const tg = Boolean(
    process.env.TELEGRAM_BOT_TOKEN?.trim() &&
      process.env.TELEGRAM_CHAT_ID?.trim(),
  );
  const push = isWebPushConfigured();
  const devices = push ? (await listPushSubscriptions()).length : 0;

  if (!email && !tg && !(push && devices > 0)) {
    return NextResponse.json(
      {
        error:
          "Brak kanału. Włącz push na iPhonie albo ustaw SMTP / Telegram.",
      },
      { status: 400 },
    );
  }

  await notifyTeam({
    title: "🔔 Test Cosgral Hub",
    body: `Test powiadomienia.${email ? `\nEmail → ${notifyEmailTo()}` : ""}`,
    href: "/admin/powiadomienia",
  });

  return NextResponse.json({
    ok: true,
    email,
    email_to: notifyEmailTo(),
    telegram: tg,
    web_push: push,
    push_devices: devices,
    push_sent: devices,
  });
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const push = isWebPushConfigured();
  const devices = push ? (await listPushSubscriptions()).length : 0;

  return NextResponse.json({
    email: isEmailConfigured(),
    email_to: notifyEmailTo(),
    telegram: Boolean(
      process.env.TELEGRAM_BOT_TOKEN?.trim() &&
        process.env.TELEGRAM_CHAT_ID?.trim(),
    ),
    web_push: push,
    push_devices: devices,
    notify_base:
      process.env.COSGRAL_NOTIFY_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      null,
  });
}
