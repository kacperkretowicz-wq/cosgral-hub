import { isSupabaseConfigured } from "./index";
import { createLocalDb } from "./local";
import { createSupabaseDb } from "./supabase";
import type { DbClient } from "./index";

let db: DbClient | null = null;

export function getDb(): DbClient {
  if (!db) {
    db = isSupabaseConfigured() ? createSupabaseDb() : createLocalDb();
  }
  return db;
}

export function resetDb() {
  db = null;
}

export { isSupabaseConfigured };
