/**
 * POST /api/portal/setup-auth
 *
 * First-time client registration.
 * Requires a valid portal_slug (the link the admin shared).
 * Creates a username + hashed password + optional hashed 4-digit PIN.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function hashSecret(secret: string, salt: string): string {
  const key = scryptSync(secret, salt, 64);
  return key.toString("hex");
}

function makeSalt() {
  return randomBytes(16).toString("hex");
}

export async function POST(request: Request) {
  const body = await request.json() as {
    slug: string;
    username: string;
    password: string;
    pin?: string; // 4-digit string, optional
  };

  const { slug, username, password, pin } = body;

  if (!slug || !username?.trim() || !password) {
    return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
  }
  if (password.length < 4) {
    return NextResponse.json({ error: "Hasło musi mieć co najmniej 4 znaki" }, { status: 400 });
  }
  if (pin && !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "PIN musi mieć dokładnie 4 cyfry" }, { status: 400 });
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

  // Check if auth already set up
  const { data: existing } = await supabase
    .from("portal_auth")
    .select("id")
    .eq("crm_client_id", client.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Konto już istnieje — zaloguj się" }, { status: 409 });
  }

  // Check username uniqueness (case-insensitive)
  const usernameLower = username.trim().toLowerCase();
  const { data: taken } = await supabase
    .from("portal_auth")
    .select("id")
    .eq("username_lower", usernameLower)
    .single();

  if (taken) {
    return NextResponse.json({ error: "Nazwa użytkownika jest zajęta" }, { status: 409 });
  }

  // Hash password
  const passwordSalt = makeSalt();
  const passwordHash = hashSecret(password, passwordSalt);

  // Hash PIN (optional)
  let pinHash: string | null = null;
  let pinSalt: string | null = null;
  if (pin) {
    pinSalt = makeSalt();
    pinHash = hashSecret(pin, pinSalt);
  }

  // Create session token (30 days)
  const sessionToken = randomBytes(32).toString("hex");
  const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("portal_auth").insert({
    crm_client_id: client.id,
    username: username.trim(),
    username_lower: usernameLower,
    password_hash: passwordHash,
    password_salt: passwordSalt,
    pin_hash: pinHash,
    pin_salt: pinSalt,
    session_token: sessionToken,
    session_expires_at: sessionExpiresAt,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    token: sessionToken,
    company_name: client.company_name,
    crm_client_id: client.id,
    requester_name: username.trim(),
  });
}
