import { promises as fs } from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_NAME = "cosgral-crm";

function isEphemeralHost(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.NETLIFY) ||
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
  );
}

function shouldUseBlobs(): boolean {
  if (process.env.COSGRAL_DB_MODE === "local") return false;
  if (process.env.COSGRAL_DB_MODE === "blobs") return true;
  return isEphemeralHost();
}

function blobs() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

/** Persistent JSON store: Netlify Blobs in production, local files in dev. */
export async function readJsonStore<T>(file: string, fallback: T): Promise<T> {
  if (shouldUseBlobs()) {
    try {
      const data = (await blobs().get(file, { type: "json" })) as T | null;
      return (data ?? fallback) as T;
    } catch {
      return fallback;
    }
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonStore<T>(file: string, data: T): Promise<void> {
  if (shouldUseBlobs()) {
    await blobs().setJSON(file, data);
    return;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    path.join(DATA_DIR, file),
    JSON.stringify(data, null, 2),
    "utf-8",
  );
}

export function isBlobsDbEnabled(): boolean {
  return shouldUseBlobs();
}
