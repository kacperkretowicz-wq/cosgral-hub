import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import {
  removePushSubscription,
  upsertPushSubscription,
} from "@/lib/push-store";
import { getVapidPublicKey, isWebPushConfigured } from "@/lib/web-push";

const subSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  return NextResponse.json({
    configured: isWebPushConfigured(),
    publicKey: getVapidPublicKey(),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: "Web Push nie skonfigurowany (VAPID keys)." },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const parsed = subSchema.parse(body);
    const ua = request.headers.get("user-agent") ?? undefined;
    await upsertPushSubscription(parsed, ua);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Błąd zapisu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const endpoint =
      typeof body?.endpoint === "string" ? body.endpoint : "";
    if (!endpoint) {
      return NextResponse.json({ error: "Brak endpoint" }, { status: 400 });
    }
    await removePushSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
