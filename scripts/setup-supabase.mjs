#!/usr/bin/env node
/**
 * Cosgral Portal — Supabase setup script
 *
 * Usage:
 *   1. W Supabase Dashboard → Settings → API skopiuj klucze do .env.local
 *   2. node scripts/setup-supabase.mjs
 *
 * Skrypt:
 *   - Uruchamia migrację SQL (tabele clients, submissions, files)
 *   - Tworzy konta admin: jakub.gral00@gmail.com, kacper.kretowicz@op.pl
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnv() {
  try {
    const envPath = resolve(ROOT, ".env.local");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq);
      let val = trimmed.slice(eq + 1);
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local optional if vars set in shell
  }
}

loadEnv();

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://bduwbnnvhahtcjjxaazv.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

const ADMINS = [
  { email: "jakub.gral00@gmail.com", password: "Cosgral2026!Jakub" },
  { email: "kacper.kretowicz@op.pl", password: "Cosgral2026!Kacper" },
];

async function runMigration() {
  if (!DATABASE_URL) {
    console.log("\n⚠ DATABASE_URL nie ustawiony — pomijam migrację SQL.");
    console.log(
      "  Uruchom SQL ręcznie w Supabase Dashboard → SQL Editor:",
    );
    console.log("  Plik: supabase/migrations/001_initial_schema.sql\n");
    return false;
  }

  const sql = readFileSync(
    resolve(ROOT, "supabase/migrations/001_initial_schema.sql"),
    "utf-8",
  );

  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
    console.log("✓ Migracja SQL wykonana");
    return true;
  } finally {
    await client.end();
  }
}

async function createAdminUsers() {
  if (!SERVICE_ROLE_KEY) {
    console.error("✗ Brak SUPABASE_SERVICE_ROLE_KEY w .env.local");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const admin of ADMINS) {
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users?.find((u) => u.email === admin.email);

    if (found) {
      console.log(`✓ Konto już istnieje: ${admin.email}`);
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: admin.email,
      password: admin.password,
      email_confirm: true,
    });

    if (error) {
      console.error(`✗ Błąd tworzenia ${admin.email}:`, error.message);
    } else {
      console.log(`✓ Utworzono konto: ${admin.email}`);
      console.log(`  Hasło tymczasowe: ${admin.password}`);
    }
  }
}

async function main() {
  console.log("Cosgral Portal — setup Supabase");
  console.log(`Projekt: ${SUPABASE_URL}\n`);

  await runMigration();
  await createAdminUsers();

  console.log("\n✓ Setup zakończony. Zaloguj się na /admin/login");
  console.log("  Zmień hasła po pierwszym logowaniu!\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
