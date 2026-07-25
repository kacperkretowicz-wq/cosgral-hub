/**
 * One-time Supabase setup: migration + admin users
 * Run: node scripts/run-setup.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnv() {
  const content = readFileSync(resolve(ROOT, ".env.local"), "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1);
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMINS = [
  { email: "jakub.gral00@gmail.com", password: "Cosgral2026!Jakub" },
  { email: "kacper.kretowicz@op.pl", password: "Cosgral2026!Kacper" },
];

async function runMigrationViaFetch() {
  const sql = readFileSync(
    resolve(ROOT, "supabase/migrations/001_initial_schema.sql"),
    "utf-8",
  );

  const res = await fetch(`${URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: SECRET,
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res.ok) return true;

  const res2 = await fetch(`${URL}/pg/query`, {
    method: "POST",
    headers: {
      apikey: SECRET,
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  return res2.ok;
}

async function runMigrationStatements(supabase) {
  const statements = [
    `DO $$ BEGIN
      CREATE TYPE page_type AS ENUM ('onepage', 'multipage');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `DO $$ BEGIN
      CREATE TYPE client_status AS ENUM ('draft', 'sent', 'submitted');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_name TEXT NOT NULL,
      industry TEXT,
      page_type page_type NOT NULL DEFAULT 'onepage',
      deadline DATE,
      token TEXT UNIQUE NOT NULL,
      drive_folder_id TEXT,
      drive_section_folders JSONB DEFAULT '{}',
      drive_doc_id TEXT,
      inspirations JSONB DEFAULT '[]',
      status client_status NOT NULL DEFAULT 'draft',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      section_key TEXT NOT NULL,
      field_key TEXT NOT NULL,
      text_content TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(client_id, section_key, field_key)
    )`,
    `CREATE TABLE IF NOT EXISTS files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      section_key TEXT NOT NULL,
      drive_file_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_clients_token ON clients(token)`,
    `CREATE INDEX IF NOT EXISTS idx_submissions_client ON submissions(client_id)`,
    `CREATE INDEX IF NOT EXISTS idx_files_client ON files(client_id)`,
    `ALTER TABLE clients ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE submissions ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE files ENABLE ROW LEVEL SECURITY`,
  ];

  for (const sql of statements) {
    const { error } = await supabase.rpc("exec", { sql });
    if (error) {
      // rpc may not exist — try direct SQL endpoint
    }
  }

  return false;
}

async function createUsers(supabase) {
  for (const admin of ADMINS) {
    const { data: list } = await supabase.auth.admin.listUsers();
    const exists = list?.users?.find((u) => u.email === admin.email);

    if (exists) {
      console.log(`✓ Konto istnieje: ${admin.email}`);
      continue;
    }

    const { error } = await supabase.auth.admin.createUser({
      email: admin.email,
      password: admin.password,
      email_confirm: true,
    });

    if (error) {
      console.error(`✗ ${admin.email}: ${error.message}`);
    } else {
      console.log(`✓ Utworzono: ${admin.email} (hasło: ${admin.password})`);
    }
  }
}

async function checkTables(supabase) {
  const { error } = await supabase.from("clients").select("id").limit(1);
  return !error || error.code !== "PGRST205";
}

async function main() {
  console.log("Cosgral — Supabase setup\n");

  const supabase = createClient(URL, SECRET, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const tablesExist = await checkTables(supabase);

  if (tablesExist) {
    console.log("✓ Tabele już istnieją");
  } else {
    console.log("⚠ Tabele nie istnieją — uruchamiam migrację SQL...");
    const migrated = await runMigrationViaFetch();
    if (!migrated) {
      await runMigrationStatements(supabase);
      const nowExists = await checkTables(supabase);
      if (!nowExists) {
        console.log("\n⚠ Migracja wymaga SQL Editor. Uruchamiam SQL przez Management API...");
        const sql = readFileSync(
          resolve(ROOT, "supabase/migrations/001_initial_schema.sql"),
          "utf-8",
        );
        const res = await fetch(
          `https://api.supabase.com/v1/projects/bduwbnnvhahtcjjxaazv/database/query`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SECRET}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: sql }),
          },
        );
        if (!res.ok) {
          const body = await res.text();
          console.log(`  API SQL: ${res.status} — ${body.slice(0, 200)}`);
          console.log("\n→ Wklej SQL ręcznie w Supabase SQL Editor:");
          console.log("  https://supabase.com/dashboard/project/bduwbnnvhahtcjjxaazv/sql/new");
        } else {
          console.log("✓ Migracja SQL wykonana");
        }
      }
    } else {
      console.log("✓ Migracja wykonana");
    }
  }

  console.log("\nTworzenie kont admin...");
  await createUsers(supabase);

  const finalCheck = await checkTables(supabase);
  console.log(`\n${finalCheck ? "✓" : "✗"} Tabele clients: ${finalCheck ? "OK" : "BRAK — uruchom SQL ręcznie"}`);
  console.log("\nGotowe! Uruchom: npm run dev → /admin/login\n");
}

main().catch(console.error);
