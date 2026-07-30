import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./db";
import { createLocalIntranetDb } from "./intranet-local";
import { assertPersistentDb } from "./persistence";
import { isMissingColumnError } from "./schema-errors";
import type { CrmClient, Note, Project, ResourceLink } from "./types";

const MONEY_KEYS = ["value_pln", "cost_pln", "billing_status", "paid_at"] as const;

function withMoneyDefaults(project: Project): Project {
  return {
    ...project,
    value_pln: project.value_pln ?? null,
    cost_pln: project.cost_pln ?? null,
    billing_status: project.billing_status ?? "wycena",
    paid_at: project.paid_at ?? null,
  };
}

function withoutMoneyFields<T extends Record<string, unknown>>(input: T) {
  const next = { ...input };
  for (const key of MONEY_KEYS) delete next[key];
  return next;
}

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

let db: ReturnType<typeof createLocalIntranetDb> | null = null;

export function getIntranetDb() {
  if (!db) {
    db = isSupabaseConfigured()
      ? createSupabaseIntranetDb()
      : createLocalIntranetDb();
  }
  return db;
}

export function resetIntranetDb() {
  db = null;
}

function isNotFoundError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "PGRST116" ||
    (error.message ?? "").toLowerCase().includes("no rows")
  );
}

function createSupabaseIntranetDb() {
  return {
    async getCrmClients(): Promise<CrmClient[]> {
      const { data, error } = await getSupabaseClient()
        .from("crm_clients")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },

    async getCrmClient(id: string): Promise<CrmClient | null> {
      const { data, error } = await getSupabaseClient()
        .from("crm_clients")
        .select("*")
        .eq("id", id)
        .single();
      if (error) {
        if (isNotFoundError(error)) return null;
        throw new Error(error.message);
      }
      return data;
    },

    async createCrmClient(
      input: Omit<CrmClient, "id" | "created_at" | "updated_at">,
    ): Promise<CrmClient> {
      assertPersistentDb("utworzenie klienta CRM");
      const { data, error } = await getSupabaseClient()
        .from("crm_clients")
        .insert({ ...input, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    async updateCrmClient(
      id: string,
      input: Partial<CrmClient>,
    ): Promise<CrmClient> {
      assertPersistentDb("aktualizacja klienta CRM");
      const { data, error } = await getSupabaseClient()
        .from("crm_clients")
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    async getProjects(filters?: {
      status?: string;
      service_type?: string;
      crm_client_id?: string;
    }): Promise<Project[]> {
      let q = getSupabaseClient()
        .from("projects")
        .select("*, crm_clients(*)")
        .order("updated_at", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.service_type) q = q.eq("service_type", filters.service_type);
      if (filters?.crm_client_id)
        q = q.eq("crm_client_id", filters.crm_client_id);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return ((data ?? []) as Project[]).map(withMoneyDefaults);
    },

    async getProject(id: string): Promise<Project | null> {
      const { data, error } = await getSupabaseClient()
        .from("projects")
        .select("*, crm_clients(*)")
        .eq("id", id)
        .single();
      if (error) {
        if (isNotFoundError(error)) return null;
        throw new Error(error.message);
      }
      return withMoneyDefaults(data as Project);
    },

    async createProject(
      input: Omit<Project, "id" | "created_at" | "updated_at" | "crm_clients">,
    ): Promise<Project> {
      assertPersistentDb("utworzenie zlecenia");
      const payload = { ...input, updated_at: new Date().toISOString() };
      const first = await getSupabaseClient()
        .from("projects")
        .insert(payload)
        .select("*, crm_clients(*)")
        .single();
      if (!first.error) return withMoneyDefaults(first.data as Project);

      if (isMissingColumnError(first.error)) {
        const retry = await getSupabaseClient()
          .from("projects")
          .insert(withoutMoneyFields(payload as Record<string, unknown>))
          .select("*, crm_clients(*)")
          .single();
        if (retry.error) throw new Error(retry.error.message);
        return withMoneyDefaults(retry.data as Project);
      }
      throw new Error(first.error.message);
    },

    async updateProject(
      id: string,
      input: Partial<Project>,
    ): Promise<Project> {
      assertPersistentDb("aktualizacja zlecenia");
      const { crm_clients: _, ...rest } = input as Project;
      const payload = { ...rest, updated_at: new Date().toISOString() };
      const first = await getSupabaseClient()
        .from("projects")
        .update(payload)
        .eq("id", id)
        .select("*, crm_clients(*)")
        .single();
      if (!first.error) return withMoneyDefaults(first.data as Project);

      if (isMissingColumnError(first.error)) {
        const moneyOnly = MONEY_KEYS.some((k) => k in rest);
        if (moneyOnly) {
          throw new Error(
            "Kolumny finansów zlecenia nie istnieją — uruchom migrację 008 na /admin/setup.",
          );
        }
        const retry = await getSupabaseClient()
          .from("projects")
          .update(withoutMoneyFields(payload as Record<string, unknown>))
          .eq("id", id)
          .select("*, crm_clients(*)")
          .single();
        if (retry.error) throw new Error(retry.error.message);
        return withMoneyDefaults(retry.data as Project);
      }
      throw new Error(first.error.message);
    },

    async getNotes(filters: {
      project_id?: string;
      crm_client_id?: string;
    }): Promise<Note[]> {
      let q = getSupabaseClient()
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false });
      if (filters.project_id) q = q.eq("project_id", filters.project_id);
      if (filters.crm_client_id)
        q = q.eq("crm_client_id", filters.crm_client_id);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    },

    async createNote(input: Omit<Note, "id" | "created_at">): Promise<Note> {
      assertPersistentDb("utworzenie notatki");
      const { data, error } = await getSupabaseClient()
        .from("notes")
        .insert(input)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    async getResourceLinks(filters: {
      project_id?: string;
      crm_client_id?: string;
    }): Promise<ResourceLink[]> {
      let q = getSupabaseClient()
        .from("resource_links")
        .select("*")
        .order("created_at", { ascending: false });
      if (filters.project_id) q = q.eq("project_id", filters.project_id);
      if (filters.crm_client_id)
        q = q.eq("crm_client_id", filters.crm_client_id);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    },

    async createResourceLink(
      input: Omit<ResourceLink, "id" | "created_at">,
    ): Promise<ResourceLink> {
      assertPersistentDb("utworzenie linku");
      const { data, error } = await getSupabaseClient()
        .from("resource_links")
        .insert(input)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    async deleteResourceLink(id: string): Promise<void> {
      assertPersistentDb("usunięcie linku");
      const { error } = await getSupabaseClient()
        .from("resource_links")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },

    async deleteCrmClient(id: string): Promise<void> {
      assertPersistentDb("usunięcie klienta CRM");
      const { error } = await getSupabaseClient()
        .from("crm_clients")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },

    async deleteProject(id: string): Promise<void> {
      assertPersistentDb("usunięcie zlecenia");
      const { error } = await getSupabaseClient()
        .from("projects")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },

    async deleteNote(id: string): Promise<void> {
      assertPersistentDb("usunięcie notatki");
      const { error } = await getSupabaseClient()
        .from("notes")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
  };
}
