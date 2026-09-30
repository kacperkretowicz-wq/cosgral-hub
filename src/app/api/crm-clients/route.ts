import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { getIntranetDb } from "@/lib/intranet-db";
import { getGoogleAuth, isGoogleWorkspaceConfigured } from "@/lib/google-auth";
import { google } from "googleapis";
// Dynamic import to avoid circular dep — reuse ensureClientDriveFolder logic inline
import { createClient } from "@supabase/supabase-js";

/** Fire-and-forget: create Drive folder for new client */
async function createDriveFolderForClient(clientId: string, companyName: string) {
  if (!isGoogleWorkspaceConfigured()) return;
  try {
    // Dynamically import to avoid issues at build time
    const { ensureClientDriveFolder } = await import("@/app/api/portal/gdrive-init/route");
    const auth = getGoogleAuth()!;
    const drive = google.drive({ version: "v3", auth });
    await ensureClientDriveFolder(drive, clientId, companyName);
  } catch (err) {
    // Non-fatal — folder will be created lazily on first upload
    console.warn("[crm-clients] Could not pre-create Drive folder:", err);
  }
}

const createSchema = z.object({
  company_name: z.string().min(1),
  contact_name: z.string().optional(),
  email: z
    .union([z.string().email(), z.literal("")])
    .optional(),
  phone: z.string().optional(),
  industry: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const data = await getIntranetDb().getCrmClients();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const parsed = createSchema.parse(body);
    const data = await getIntranetDb().createCrmClient({
      company_name: parsed.company_name,
      contact_name: parsed.contact_name ?? null,
      email: parsed.email || null,
      phone: parsed.phone ?? null,
      industry: parsed.industry ?? null,
      notes: parsed.notes ?? "",
      tags: parsed.tags ?? [],
    });
    // Auto-create Google Drive folder (non-blocking)
    void createDriveFolderForClient(data.id as string, parsed.company_name);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
