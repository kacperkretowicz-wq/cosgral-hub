import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { promises as fs } from "fs";
import path from "path";
import { isSupabaseConfigured } from "./db";
import { assertPersistentDb } from "./persistence";
import type { Lead, LeadStatus, Task, TaskStatus } from "./types";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const DATA_DIR = path.join(process.cwd(), "data");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(file: string, data: T): Promise<void> {
  assertPersistentDb("zapis danych ops");
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    path.join(DATA_DIR, file),
    JSON.stringify(data, null, 2),
    "utf-8",
  );
}

export type OpsDb = ReturnType<typeof createLocalOpsDb>;

let ops: OpsDb | null = null;

export function getOpsDb(): OpsDb {
  if (!ops) {
    ops = isSupabaseConfigured() ? createSupabaseOpsDb() : createLocalOpsDb();
  }
  return ops;
}

function createLocalOpsDb() {
  return {
    async getTasks(filters?: {
      from?: string;
      to?: string;
      assignee?: string;
    }): Promise<Task[]> {
      let tasks = await readJson<Task[]>("tasks.json", []);
      if (filters?.assignee) {
        tasks = tasks.filter((t) => t.assignee === filters.assignee);
      }
      if (filters?.from) {
        tasks = tasks.filter(
          (t) => t.due_date && t.due_date >= filters.from!,
        );
      }
      if (filters?.to) {
        tasks = tasks.filter((t) => t.due_date && t.due_date <= filters.to!);
      }
      return tasks.sort((a, b) =>
        (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"),
      );
    },

    async createTask(
      input: Omit<Task, "id" | "created_at" | "updated_at" | "projects">,
    ): Promise<Task> {
      const tasks = await readJson<Task[]>("tasks.json", []);
      const now = new Date().toISOString();
      const task: Task = {
        ...input,
        id: uuidv4(),
        created_at: now,
        updated_at: now,
      };
      tasks.unshift(task);
      await writeJson("tasks.json", tasks);
      return task;
    },

    async updateTask(id: string, input: Partial<Task>): Promise<Task> {
      const tasks = await readJson<Task[]>("tasks.json", []);
      const idx = tasks.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error("Task not found");
      const { projects: _, ...rest } = input;
      tasks[idx] = {
        ...tasks[idx],
        ...rest,
        updated_at: new Date().toISOString(),
      };
      await writeJson("tasks.json", tasks);
      return tasks[idx];
    },

    async deleteTask(id: string): Promise<void> {
      const tasks = await readJson<Task[]>("tasks.json", []);
      await writeJson(
        "tasks.json",
        tasks.filter((t) => t.id !== id),
      );
    },

    async getLeads(filters?: { status?: LeadStatus }): Promise<Lead[]> {
      let leads = await readJson<Lead[]>("leads.json", []);
      if (filters?.status) {
        leads = leads.filter((l) => l.status === filters.status);
      }
      return leads.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    },

    async getLead(id: string): Promise<Lead | null> {
      const leads = await readJson<Lead[]>("leads.json", []);
      return leads.find((l) => l.id === id) ?? null;
    },

    async createLead(
      input: Omit<Lead, "id" | "created_at" | "updated_at">,
    ): Promise<Lead> {
      const leads = await readJson<Lead[]>("leads.json", []);
      const now = new Date().toISOString();
      const lead: Lead = {
        ...input,
        id: uuidv4(),
        created_at: now,
        updated_at: now,
      };
      leads.unshift(lead);
      await writeJson("leads.json", leads);
      return lead;
    },

    async updateLead(id: string, input: Partial<Lead>): Promise<Lead> {
      const leads = await readJson<Lead[]>("leads.json", []);
      const idx = leads.findIndex((l) => l.id === id);
      if (idx === -1) throw new Error("Lead not found");
      leads[idx] = {
        ...leads[idx],
        ...input,
        updated_at: new Date().toISOString(),
      };
      await writeJson("leads.json", leads);
      return leads[idx];
    },

    async deleteLead(id: string): Promise<void> {
      const leads = await readJson<Lead[]>("leads.json", []);
      await writeJson(
        "leads.json",
        leads.filter((l) => l.id !== id),
      );
    },
  };
}

function createSupabaseOpsDb() {
  return {
    async getTasks(filters?: {
      from?: string;
      to?: string;
      assignee?: string;
    }): Promise<Task[]> {
      let q = getSupabase()
        .from("tasks")
        .select("*, projects(id, title)")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (filters?.assignee) q = q.eq("assignee", filters.assignee);
      if (filters?.from) q = q.gte("due_date", filters.from);
      if (filters?.to) q = q.lte("due_date", filters.to);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as Task[];
    },

    async createTask(
      input: Omit<Task, "id" | "created_at" | "updated_at" | "projects">,
    ): Promise<Task> {
      assertPersistentDb("utworzenie zadania");
      const { data, error } = await getSupabase()
        .from("tasks")
        .insert({ ...input, updated_at: new Date().toISOString() })
        .select("*, projects(id, title)")
        .single();
      if (error) throw new Error(error.message);
      return data as Task;
    },

    async updateTask(id: string, input: Partial<Task>): Promise<Task> {
      assertPersistentDb("aktualizacja zadania");
      const { projects: _, ...rest } = input as Task;
      const { data, error } = await getSupabase()
        .from("tasks")
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*, projects(id, title)")
        .single();
      if (error) throw new Error(error.message);
      return data as Task;
    },

    async deleteTask(id: string): Promise<void> {
      assertPersistentDb("usunięcie zadania");
      const { error } = await getSupabase().from("tasks").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },

    async getLeads(filters?: { status?: LeadStatus }): Promise<Lead[]> {
      let q = getSupabase()
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    },

    async getLead(id: string): Promise<Lead | null> {
      const { data, error } = await getSupabase()
        .from("leads")
        .select("*")
        .eq("id", id)
        .single();
      if (error) return null;
      return data;
    },

    async createLead(
      input: Omit<Lead, "id" | "created_at" | "updated_at">,
    ): Promise<Lead> {
      assertPersistentDb("utworzenie leada");
      const { data, error } = await getSupabase()
        .from("leads")
        .insert({ ...input, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    async updateLead(id: string, input: Partial<Lead>): Promise<Lead> {
      assertPersistentDb("aktualizacja leada");
      const { data, error } = await getSupabase()
        .from("leads")
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    async deleteLead(id: string): Promise<void> {
      assertPersistentDb("usunięcie leada");
      const { error } = await getSupabase().from("leads").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
  };
}
