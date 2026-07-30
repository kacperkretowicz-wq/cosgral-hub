/** Detect PostgREST / Postgres missing relation or column errors. */

export function isMissingRelationError(error: {
  code?: string;
  message?: string;
}): boolean {
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    msg.includes("could not find the table") ||
    (msg.includes("does not exist") && msg.includes("relation")) ||
    (msg.includes("schema cache") && msg.includes("table"))
  );
}

export function isMissingColumnError(error: {
  code?: string;
  message?: string;
}): boolean {
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    (msg.includes("column") && msg.includes("does not exist")) ||
    (msg.includes("schema cache") && msg.includes("column"))
  );
}

export const SCHEMA_SETUP_HINT =
  "Brakuje tabel/kolumn w Supabase. Otwórz /admin/setup i uruchom migracje (hasło bazy lub DATABASE_URL).";
