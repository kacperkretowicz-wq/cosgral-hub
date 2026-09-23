/**
 * Team notifications → iPhone Web Push + email + optional Telegram.
 *
 * Email → kontakt@cosgral.pl (domyślnie):
 *   NOTIFY_EMAIL_TO=kontakt@cosgral.pl
 *   NOTIFY_EMAIL_FROM=Cosgral Hub <kontakt@cosgral.pl>
 *   SMTP_HOST=smtp.seohost.pl   (lub mail.cosgral.pl — z panelu hostingu)
 *   SMTP_PORT=587
 *   SMTP_USER=kontakt@cosgral.pl
 *   SMTP_PASS=...
 *
 * Alternatywa: RESEND_API_KEY=re_...  (+ zweryfikowana domena)
 *
 * iPhone / PWA Web Push:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT
 *
 * Telegram (opcjonalnie):
 *   TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID
 */

import nodemailer from "nodemailer";

function notifyBaseUrl(): string {
  return (
    process.env.COSGRAL_NOTIFY_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");
}

/** Absolute Hub link for phone notifications. */
export function hubLink(path: string): string {
  const base = notifyBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

export type NotifyPayload = {
  title: string;
  body?: string;
  /** Relative Hub path, e.g. /admin/tasks */
  href?: string;
};

function formatMessage({ title, body, href }: NotifyPayload): string {
  const lines = [title];
  if (body?.trim()) lines.push(body.trim().slice(0, 800));
  if (href) lines.push("", `→ ${hubLink(href)}`);
  return lines.join("\n");
}

function emailRecipients(): string[] {
  const raw =
    process.env.NOTIFY_EMAIL_TO?.trim() || "kontakt@cosgral.pl";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.slice(0, 3500),
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendEmailSmtp(payload: NotifyPayload): Promise<boolean> {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return false;

  const port = Number(process.env.SMTP_PORT || "587");
  const from =
    process.env.NOTIFY_EMAIL_FROM?.trim() ||
    `Cosgral Hub <${user}>`;
  const to = emailRecipients();
  const text = formatMessage(payload);
  const link = payload.href ? hubLink(payload.href) : "";

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: to.join(", "),
      subject: payload.title.slice(0, 120),
      text,
      html: `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
  <h2 style="margin:0 0 12px;font-size:18px">${escapeHtml(payload.title)}</h2>
  ${
    payload.body
      ? `<p style="white-space:pre-wrap;margin:0 0 16px">${escapeHtml(payload.body.slice(0, 800))}</p>`
      : ""
  }
  ${
    link
      ? `<p><a href="${escapeHtml(link)}" style="color:#111">Otwórz w Hubie →</a></p>`
      : ""
  }
  <p style="margin-top:24px;font-size:12px;color:#888">Cosgral Hub</p>
</div>`,
    });
    return true;
  } catch {
    return false;
  }
}

async function sendEmailResend(payload: NotifyPayload): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;

  const from =
    process.env.NOTIFY_EMAIL_FROM?.trim() ||
    "Cosgral Hub <onboarding@resend.dev>";
  const to = emailRecipients();
  const text = formatMessage(payload);
  const link = payload.href ? hubLink(payload.href) : "";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "User-Agent": "cosgral-hub/1.0",
      },
      body: JSON.stringify({
        from,
        to,
        subject: payload.title.slice(0, 120),
        text,
        html: `<div style="font-family:system-ui,sans-serif;line-height:1.5">
  <h2>${escapeHtml(payload.title)}</h2>
  ${payload.body ? `<p style="white-space:pre-wrap">${escapeHtml(payload.body.slice(0, 800))}</p>` : ""}
  ${link ? `<p><a href="${escapeHtml(link)}">Otwórz w Hubie →</a></p>` : ""}
</div>`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendEmail(payload: NotifyPayload): Promise<boolean> {
  if (await sendEmailSmtp(payload)) return true;
  return sendEmailResend(payload);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Send to iPhone push + email + Telegram (whichever configured). */
export async function notifyTeam(payload: NotifyPayload): Promise<void> {
  const text = formatMessage(payload);
  const { sendWebPush } = await import("./web-push");
  await Promise.allSettled([
    sendTelegram(text),
    sendEmail(payload),
    sendWebPush(payload),
  ]);
}

/** @deprecated use notifyTeam — kept for older imports */
export async function notifyTelegram(text: string): Promise<void> {
  await notifyTeam({ title: text });
}

export function isEmailConfigured(): boolean {
  const smtp = Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  );
  const resend = Boolean(process.env.RESEND_API_KEY?.trim());
  return smtp || resend;
}

export function notifyEmailTo(): string {
  return emailRecipients().join(", ");
}

export function cosgralMailFrom(): string {
  const user = process.env.SMTP_USER?.trim() || "kontakt@cosgral.pl";
  return (
    process.env.NOTIFY_EMAIL_FROM?.trim() || `Cosgral Hub <${user}>`
  );
}

/**
 * Outbound email from Cosgral mailbox (SMTP or Resend) to arbitrary recipients.
 * Used by Cosgral AI — not limited to NOTIFY_EMAIL_TO.
 */
export async function sendOutboundEmail(input: {
  to: string | string[];
  subject: string;
  body: string;
  replyTo?: string;
}): Promise<{ ok: boolean; detail: string }> {
  const toList = (Array.isArray(input.to) ? input.to : [input.to])
    .flatMap((s) => s.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
  if (!toList.length) {
    return { ok: false, detail: "Brak adresata (to)" };
  }
  if (!input.subject.trim()) {
    return { ok: false, detail: "Brak tematu" };
  }
  if (!isEmailConfigured()) {
    return {
      ok: false,
      detail:
        "Mail nie skonfigurowany — ustaw SMTP_* (kontakt@cosgral.pl) albo RESEND_API_KEY na Netlify.",
    };
  }

  const subject = input.subject.trim().slice(0, 180);
  const body = input.body.trim().slice(0, 20000);
  const from = cosgralMailFrom();
  const replyTo = input.replyTo?.trim() || undefined;

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (host && user && pass) {
    try {
      const port = Number(process.env.SMTP_PORT || "587");
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      await transporter.sendMail({
        from,
        to: toList.join(", "),
        replyTo,
        subject,
        text: body,
        html: `<div style="font-family:system-ui,sans-serif;line-height:1.5;white-space:pre-wrap;color:#111">${escapeHtml(body)}</div>`,
      });
      return {
        ok: true,
        detail: `Wysłano z ${user} → ${toList.join(", ")} · ${subject}`,
      };
    } catch (err) {
      return {
        ok: false,
        detail: `SMTP: ${err instanceof Error ? err.message : "błąd"}`,
      };
    }
  }

  const key = process.env.RESEND_API_KEY?.trim();
  if (key) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: toList,
          reply_to: replyTo,
          subject,
          text: body,
          html: `<div style="font-family:system-ui,sans-serif;line-height:1.5;white-space:pre-wrap">${escapeHtml(body)}</div>`,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        return { ok: false, detail: `Resend: ${t.slice(0, 160)}` };
      }
      return {
        ok: true,
        detail: `Wysłano (Resend) → ${toList.join(", ")} · ${subject}`,
      };
    } catch (err) {
      return {
        ok: false,
        detail: `Resend: ${err instanceof Error ? err.message : "błąd"}`,
      };
    }
  }

  return { ok: false, detail: "Brak działającego transportu maila" };
}
