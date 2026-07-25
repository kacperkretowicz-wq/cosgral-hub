import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./db";
import { createLocalIntranetDb } from "./intranet-local";
import type { CrmClient, Note, Project, ResourceLink } from "./types";

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
      if (error) return null;
      return data;
    },

    async createCrmClient(
      input: Omit<CrmClient, "id" | "created_at" | "updated_at">,
    ): Promise<CrmClient> {
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
    }): Promise<Project[]> {
      let q = getSupabaseClient()
        .from("projects")
        .select("*, crm_clients(*)")
        .order("updated_at", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.service_type) q = q.eq("service_type", filters.service_type);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as Project[];
    },

    async getProject(id: string): Promise<Project | null> {
      const { data, error } = await getSupabaseClient()
        .from("projects")
        .select("*, crm_clients(*)")
        .eq("id", id)
        .single();
      if (error) return null;
      return data as Project;
    },

    async createProject(
      input: Omit<Project, "id" | "created_at" | "updated_at" | "crm_clients">,
    ): Promise<Project> {
      const { data, error } = await getSupabaseClient()
        .from("projects")
        .insert({ ...input, updated_at: new Date().toISOString() })
        .select("*, crm_clients(*)")
        .single();
      if (error) throw new Error(error.message);
      return data as Project;
    },

    async updateProject(
      id: string,
      input: Partial<Project>,
    ): Promise<Project> {
      const { crm_clients: _, ...rest } = input as Project;
      const { data, error } = await getSupabaseClient()
        .from("projects")
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*, crm_clients(*)")
        .single();
      if (error) throw new Error(error.message);
      return data as Project;
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
      const { data, error } = await getSupabaseClient()
        .from("resource_links")
        .insert(input)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    async deleteResourceLink(id: string): Promise<void> {
      const { error } = await getSupabaseClient()
        .from("resource_links")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
  };
}
