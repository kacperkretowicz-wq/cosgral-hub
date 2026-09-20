import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import {
  isEmailConfigured,
  isWhatsAppConfigured,
  notifyEmailTo,
  notifyTeam,
} from "@/lib/notify";

/** POST: wyślij testowe powiadomienie (WhatsApp / email / Telegram). */
export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const wa = isWhatsAppConfigured();
  const email = isEmailConfigured();
  const tg = Boolean(
    process.env.TELEGRAM_BOT_TOKEN?.trim() &&
      process.env.TELEGRAM_CHAT_ID?.trim(),
  );

  if (!wa && !email && !tg) {
    return NextResponse.json(
      {
        error:
          "Brak kanału. Ustaw WhatsApp (Green API) albo SMTP (SMTP_HOST/USER/PASS) albo RESEND_API_KEY.",
      },
      { status: 400 },
    );
  }

  await notifyTeam({
    title: "🔔 Test Cosgral Hub",
    body: `Test powiadomienia.${email ? `\nEmail → ${notifyEmailTo()}` : ""}`,
    href: "/admin",
  });

  return NextResponse.json({
    ok: true,
    whatsapp: wa,
    email,
    email_to: notifyEmailTo(),
    telegram: tg,
  });
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  return NextResponse.json({
    whatsapp: isWhatsAppConfigured(),
    email: isEmailConfigured(),
    email_to: notifyEmailTo(),
    telegram: Boolean(
      process.env.TELEGRAM_BOT_TOKEN?.trim() &&
        process.env.TELEGRAM_CHAT_ID?.trim(),
    ),
    notify_base:
      process.env.COSGRAL_NOTIFY_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      null,
  });
}
