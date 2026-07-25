import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { DbClient } from "./index";
import type { Client, Submission, UploadedFile } from "../types";

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export function createSupabaseDb(): DbClient {
  return {
    async getClients() {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Client[];
    },

    async getClientByToken(token) {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("token", token)
        .single();
      if (error) return null;
      return data as Client;
    },

    async getClientById(id) {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();
      if (error) return null;
      return data as Client;
    },

    async createClient(data) {
      const supabase = getServiceClient();
      const { data: created, error } = await supabase
        .from("clients")
        .insert(data)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return created as Client;
    },

    async updateClient(id, data) {
      const supabase = getServiceClient();
      const { data: updated, error } = await supabase
        .from("clients")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated as Client;
    },

    async getSubmissions(clientId) {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .eq("client_id", clientId);
      if (error) throw new Error(error.message);
      return (data ?? []) as Submission[];
    },

    async getSubmissionsByToken(token) {
      const client = await this.getClientByToken(token);
      if (!client) return [];
      return this.getSubmissions(client.id);
    },

    async upsertSubmissions(clientId, rows) {
      const supabase = getServiceClient();
      const payload = rows.map((r) => ({
        client_id: clientId,
        ...r,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("submissions")
        .upsert(payload, { onConflict: "client_id,section_key,field_key" });
      if (error) throw new Error(error.message);
    },

    async getFiles(clientId) {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .eq("client_id", clientId);
      if (error) throw new Error(error.message);
      return (data ?? []) as UploadedFile[];
    },

    async getFilesByToken(token) {
      const client = await this.getClientByToken(token);
      if (!client) return [];
      return this.getFiles(client.id);
    },

    async createFile(data) {
      const supabase = getServiceClient();
      const { data: created, error } = await supabase
        .from("files")
        .insert(data)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return created as UploadedFile;
    },

    async deleteClient(id) {
      const supabase = getServiceClient();
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
  };
}
