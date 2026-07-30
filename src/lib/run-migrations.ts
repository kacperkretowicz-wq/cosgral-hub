import { promises as fs } from "fs";
import path from "path";

const MIGRATION_FILES = [
  "001_initial_schema.sql",
  "002_intranet_schema.sql",
  "003_storage_bucket.sql",
  "004_drive_doc_id.sql",
  "005_offer_content.sql",
  "006_offer_text.sql",
  "007_offer_document.sql",
  "008_agency_os.sql",
];

function projectRef(): string {
  const fromEnv = process.env.SUPABASE_PROJECT_REF;
  if (fromEnv) return fromEnv;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const fromUrl = url.replace("https://", "").replace(".supabase.co", "");
  return fromUrl || "bduwbnnvhahtcjjxaazv";
}

/** Prefer session pooler for DDL; fall back to transaction + direct. */
export function buildDatabaseUrls(dbPassword: string): string[] {
  const ref = projectRef();
  const pass = encodeURIComponent(dbPassword);
  return [
    `postgresql://postgres.${ref}:${pass}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${ref}:${pass}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres:${pass}@db.${ref}.supabase.co:5432/postgres`,
  ];
}

export function buildDatabaseUrl(dbPassword: string): string {
  return buildDatabaseUrls(dbPassword)[0];
}

export async function loadAllMigrationSql(): Promise<string> {
  const dir = path.join(process.cwd(), "supabase/migrations");
  const parts: string[] = [];
  for (const file of MIGRATION_FILES) {
    const sql = await fs.readFile(path.join(dir, file), "utf-8");
    parts.push(`-- ===== ${file} =====\n${sql}`);
  }
  return parts.join("\n\n");
}

async function tryConnect(connectionString: string) {
  const pg = await import("pg");
  const client = new pg.default.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 12_000,
  });
  await client.connect();
  return client;
}

export async function runMigrations(connectionString: string): Promise<{
  ok: boolean;
  applied: string[];
  error?: string;
  connectionUsed?: string;
}> {
  const candidates = connectionString.includes("@")
    ? [connectionString]
    : [];

  // If caller passed a password-built primary URL, also try siblings.
  const urls =
    candidates.length > 0
      ? (() => {
          try {
            const u = new URL(connectionString);
            const pass = decodeURIComponent(u.password);
            if (pass) {
              const extras = buildDatabaseUrls(pass).filter(
                (x) => x !== connectionString,
              );
              return [connectionString, ...extras];
            }
          } catch {
            /* keep single */
          }
          return candidates;
        })()
      : candidates;

  let lastError = "Brak connection string";
  for (const url of urls) {
    const applied: string[] = [];
    let client: Awaited<ReturnType<typeof tryConnect>> | null = null;
    try {
      client = await tryConnect(url);
      const dir = path.join(process.cwd(), "supabase/migrations");
      for (const file of MIGRATION_FILES) {
        const sql = await fs.readFile(path.join(dir, file), "utf-8");
        await client.query(sql);
        applied.push(file);
      }
      return { ok: true, applied, connectionUsed: url.replace(/:[^:@]+@/, ":***@") };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Migration failed";
      if (applied.length > 0) {
        return { ok: false, applied, error: lastError };
      }
      // try next connection URL
    } finally {
      await client?.end().catch(() => {});
    }
  }

  return { ok: false, applied: [], error: lastError };
}

export type SchemaHealth = {
  clients: boolean;
  offer_document: boolean;
  projects: boolean;
  tasks: boolean;
  leads: boolean;
  billing: boolean;
  ready: boolean;
  missing: string[];
};

/** Probe schema via service-role Supabase client (no DATABASE_URL needed). */
export async function probeSchemaHealth(): Promise<SchemaHealth> {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const missing: string[] = [];

  const empty: SchemaHealth = {
    clients: false,
    offer_document: false,
    projects: false,
    tasks: false,
    leads: false,
    billing: false,
    ready: false,
    missing: ["supabase_not_configured"],
  };

  if (!url || !key) return empty;

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const checkTable = async (table: string) => {
    const { error } = await supabase.from(table).select("*").limit(1);
    if (!error) return true;
    return false;
  };

  const clients = await checkTable("clients");
  if (!clients) missing.push("clients (001)");

  let offer_document = false;
  if (clients) {
    const { error } = await supabase
      .from("clients")
      .select("offer_document")
      .limit(1);
    offer_document = !error;
    if (!offer_document) missing.push("offer_document (007)");
  }

  const projects = await checkTable("projects");
  if (!projects) missing.push("projects (002)");

  let billing = false;
  if (projects) {
    const { error } = await supabase
      .from("projects")
      .select("value_pln, billing_status")
      .limit(1);
    billing = !error;
    if (!billing) missing.push("project finances (008)");
  }

  const tasks = await checkTable("tasks");
  if (!tasks) missing.push("tasks (008)");

  const leads = await checkTable("leads");
  if (!leads) missing.push("leads (008)");

  const ready =
    clients && offer_document && projects && billing && tasks && leads;

  return {
    clients,
    offer_document,
    projects,
    tasks,
    leads,
    billing,
    ready,
    missing,
  };
}
