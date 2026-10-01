import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validatePortalSession } from "@/lib/portal-db";
import { cookies } from "next/headers";
import { getVapidPublicKey, isWebPushConfigured } from "@/lib/web-push";
import { z } from "zod";

const subSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_session")?.value;
  if (!token) return null;
  return validatePortalSession(token);
}

export async function GET() {
  return NextResponse.json({
    configured: isWebPushConfigured(),
    publicKey: getVapidPublicKey(),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isWebPushConfigured()) {
    return NextResponse.json({ error: "Web Push nie skonfigurowany." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = subSchema.parse(body);
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    await db.from("portal_push_subscriptions").upsert({
      crm_client_id: session.crm_client_id,
      endpoint: parsed.endpoint,
      keys_p256dh: parsed.keys.p256dh,
      keys_auth: parsed.keys.auth,
    }, { onConflict: "endpoint" });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { endpoint } = await request.json() as { endpoint: string };
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    await db.from("portal_push_subscriptions").delete().eq("endpoint", endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
