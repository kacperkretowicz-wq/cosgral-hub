import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { DbClient } from "./index";
import type { Client, Submission, UploadedFile } from "../types";
import { assertPersistentDb } from "../persistence";

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(file: string, data: T): Promise<void> {
  assertPersistentDb("zapis oferty / klienta");
  await ensureDataDir();
  await fs.writeFile(
    path.join(DATA_DIR, file),
    JSON.stringify(data, null, 2),
    "utf-8",
  );
}

export function createLocalDb(): DbClient {
  return {
    async getClients() {
      return readJson<Client[]>("clients.json", []);
    },

    async getClientByToken(token) {
      const clients = await readJson<Client[]>("clients.json", []);
      return clients.find((c) => c.token === token) ?? null;
    },

    async getClientById(id) {
      const clients = await readJson<Client[]>("clients.json", []);
      return clients.find((c) => c.id === id) ?? null;
    },

    async createClient(data) {
      const clients = await readJson<Client[]>("clients.json", []);
      const client: Client = {
        ...data,
        id: uuidv4(),
        created_at: new Date().toISOString(),
      };
      clients.unshift(client);
      await writeJson("clients.json", clients);
      return client;
    },

    async updateClient(id, data) {
      const clients = await readJson<Client[]>("clients.json", []);
      const idx = clients.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error("Client not found");
      clients[idx] = { ...clients[idx], ...data };
      await writeJson("clients.json", clients);
      return clients[idx];
    },

    async getSubmissions(clientId) {
      const all = await readJson<Submission[]>("submissions.json", []);
      return all.filter((s) => s.client_id === clientId);
    },

    async getSubmissionsByToken(token) {
      const client = await this.getClientByToken(token);
      if (!client) return [];
      return this.getSubmissions(client.id);
    },

    async upsertSubmissions(clientId, rows) {
      const all = await readJson<Submission[]>("submissions.json", []);
      const now = new Date().toISOString();

      for (const row of rows) {
        const idx = all.findIndex(
          (s) =>
            s.client_id === clientId &&
            s.section_key === row.section_key &&
            s.field_key === row.field_key,
        );
        if (idx >= 0) {
          all[idx] = {
            ...all[idx],
            text_content: row.text_content,
            updated_at: now,
          };
        } else {
          all.push({
            id: uuidv4(),
            client_id: clientId,
            section_key: row.section_key,
            field_key: row.field_key,
            text_content: row.text_content,
            updated_at: now,
          });
        }
      }

      await writeJson("submissions.json", all);
    },

    async getFiles(clientId) {
      const all = await readJson<UploadedFile[]>("files.json", []);
      return all.filter((f) => f.client_id === clientId);
    },

    async getFilesByToken(token) {
      const client = await this.getClientByToken(token);
      if (!client) return [];
      return this.getFiles(client.id);
    },

    async createFile(data) {
      const all = await readJson<UploadedFile[]>("files.json", []);
      const file: UploadedFile = {
        ...data,
        id: uuidv4(),
        uploaded_at: new Date().toISOString(),
      };
      all.push(file);
      await writeJson("files.json", all);
      return file;
    },

    async deleteClient(id) {
      const clients = await readJson<Client[]>("clients.json", []);
      if (!clients.some((c) => c.id === id)) {
        throw new Error("Client not found");
      }

      await writeJson(
        "clients.json",
        clients.filter((c) => c.id !== id),
      );

      const submissions = await readJson<Submission[]>("submissions.json", []);
      await writeJson(
        "submissions.json",
        submissions.filter((s) => s.client_id !== id),
      );

      const files = await readJson<UploadedFile[]>("files.json", []);
      await writeJson(
        "files.json",
        files.filter((f) => f.client_id !== id),
      );

      try {
        const projects = await readJson<
          { id: string; website_client_id: string | null }[]
        >("projects.json", []);
        const remaining = projects.filter((p) => p.website_client_id !== id);
        if (remaining.length !== projects.length) {
          await writeJson("projects.json", remaining);
        }
      } catch {
        // projects file may not exist in pure local mode
      }

      const uploadsDir = path.join(DATA_DIR, "uploads", id);
      await fs.rm(uploadsDir, { recursive: true, force: true }).catch(() => {});
    },
  };
}
