import type { Client, Submission, UploadedFile } from "@/lib/types";

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const hasPublishable =
    key.startsWith("sb_publishable_") || key.startsWith("eyJ");
  const hasSecret =
    serviceKey.startsWith("sb_secret_") || serviceKey.startsWith("eyJ");
  return (
    url.includes("supabase.co") &&
    hasPublishable &&
    key.length > 20 &&
    hasSecret &&
    serviceKey.length > 20
  );
}

export interface DbClient {
  getClients(): Promise<Client[]>;
  getClientByToken(token: string): Promise<Client | null>;
  getClientById(id: string): Promise<Client | null>;
  createClient(
    data: Omit<Client, "id" | "created_at">,
  ): Promise<Client>;
  updateClient(id: string, data: Partial<Client>): Promise<Client>;
  getSubmissions(clientId: string): Promise<Submission[]>;
  getSubmissionsByToken(token: string): Promise<Submission[]>;
  upsertSubmissions(
    clientId: string,
    rows: { section_key: string; field_key: string; text_content: string }[],
  ): Promise<void>;
  getFiles(clientId: string): Promise<UploadedFile[]>;
  getFilesByToken(token: string): Promise<UploadedFile[]>;
  createFile(
    data: Omit<UploadedFile, "id" | "uploaded_at">,
  ): Promise<UploadedFile>;
  deleteClient(id: string): Promise<void>;
}
