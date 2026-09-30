/**
 * POST /api/portal/auth-login
 *
 * Login with username + password OR username + 4-digit PIN.
 * Returns a session token (30 days).
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scryptSync, timingSafeEqual } from "crypto";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function verifySecret(input: string, salt: string, storedHash: string): boolean {
  try {
    const inputHash = scryptSync(input, salt, 64);
    const stored = Buffer.from(storedHash, "hex");
    return timingSafeEqual(inputHash, stored);
  } catch {
    return false;
  }
}

import { randomBytes } from "crypto";

export async function POST(request: Request) {
  const body = await request.json() as {
    slug: string;           // to scope the login to a specific portal
    username: string;
    password?: string;      // login with password
    pin?: string;           // login with 4-digit PIN
  };

  const { slug, username, password, pin } = body;

  if (!slug || !username?.trim()) {
    return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
  }
  if (!password && !pin) {
    return NextResponse.json({ error: "Podaj hasło lub PIN" }, { status: 400 });
  }

  const supabase = db();

  // Resolve client by slug
  const { data: client } = await supabase
    .from("crm_clients")
    .select("id, company_name")
    .eq("portal_slug", slug)
    .single();

  if (!client) {
    return NextResponse.json({ error: "Nieprawidłowy link dostępu" }, { status: 404 });
  }

  // Get auth record for this client
  const { data: auth } = await supabase
    .from("portal_auth")
    .select("id, username, username_lower, password_hash, password_salt, pin_hash, pin_salt")
    .eq("crm_client_id", client.id)
    .single();

  if (!auth) {
    return NextResponse.json({ error: "Konto nie istnieje — utwórz konto" }, { status: 404 });
  }

  // Verify username (case-insensitive)
  if (auth.username_lower !== username.trim().toLowerCase()) {
    return NextResponse.json({ error: "Nieprawidłowa nazwa użytkownika lub hasło" }, { status: 401 });
  }

  // Verify credential
  let valid = false;
  if (password) {
    valid = verifySecret(password, auth.password_salt, auth.password_hash);
  } else if (pin && auth.pin_hash && auth.pin_salt) {
    valid = verifySecret(pin, auth.pin_salt, auth.pin_hash);
  }

  if (!valid) {
    return NextResponse.json({ error: "Nieprawidłowa nazwa użytkownika lub hasło" }, { status: 401 });
  }

  // Refresh session token
  const sessionToken = randomBytes(32).toString("hex");
  const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from("portal_auth")
    .update({ session_token: sessionToken, session_expires_at: sessionExpiresAt })
    .eq("id", auth.id);

  return NextResponse.json({
    ok: true,
    token: sessionToken,
    company_name: client.company_name,
    crm_client_id: client.id,
    requester_name: auth.username,
  });
}
