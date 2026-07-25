import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { getDb } from "@/lib/db/client";
import { normalizeOptionalDate } from "@/lib/date-utils";
import { getIntranetDb } from "@/lib/intranet-db";
import { getAppBaseUrl, getOfferUrl } from "@/lib/app-url";

const offerContentSchema = z.object({
  intro: z.string(),
  closing: z.string(),
  sections: z.array(
    z.object({
      number: z.string(),
      title: z.string(),
      items: z.array(z.string()),
    }),
  ),
});

const createSchema = z.object({
  company_name: z.string().min(1),
  industry: z.string().optional(),
  page_type: z.enum(["onepage", "multipage"]),
  deadline: z.string().optional(),
  crm_client_id: z.string().uuid().optional(),
  create_crm: z.boolean().optional(),
  offer_text: z.string().min(1).optional(),
  offer_content: offerContentSchema.optional(),
});

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const db = getDb();
    const data = await db.getClients();
    return NextResponse.json(data);
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
    const deadline = normalizeOptionalDate(parsed.deadline);
    const token = uuidv4();
    const db = getDb();

    const { createClientFolder, isDriveConfigured } = await import(
      "@/lib/google-drive"
    );
    const { createClientDoc } = await import("@/lib/google-docs");

    let driveFolderId: string | null = null;
    let driveSectionFolders: Record<string, string> = {};
    let driveDocId: string | null = null;

    if (isDriveConfigured()) {
      const driveResult = await createClientFolder(parsed.company_name);
      if (driveResult) {
        driveFolderId = driveResult.folderId;
        driveSectionFolders = driveResult.sectionFolders;
        driveDocId = await createClientDoc(
          parsed.company_name,
          driveResult.folderId,
        );
      }
    }

    const inspirations: ReturnType<typeof normalizeInspiration>[] = [];

    const data = await db.createClient({
      company_name: parsed.company_name,
      industry: parsed.industry ?? null,
      page_type: parsed.page_type,
      deadline,
      token,
      drive_folder_id: driveFolderId,
      drive_section_folders: driveSectionFolders,
      drive_doc_id: driveDocId,
      inspirations,
      offer_content: parsed.offer_content ?? null,
      offer_text: parsed.offer_text?.trim() ?? null,
      status: "sent",
    });

    let crmClientId = parsed.crm_client_id ?? null;
    let projectId: string | null = null;

    try {
      const intranet = getIntranetDb();

      if (!crmClientId && parsed.create_crm !== false) {
        const existing = (await intranet.getCrmClients()).find(
          (c) =>
            c.company_name.toLowerCase() ===
            parsed.company_name.toLowerCase(),
        );
        if (existing) {
          crmClientId = existing.id;
        } else {
          const crm = await intranet.createCrmClient({
            company_name: parsed.company_name,
            contact_name: null,
            email: null,
            phone: null,
            industry: parsed.industry ?? null,
            notes: "",
          });
          crmClientId = crm.id;
        }
      }

      const project = await intranet.createProject({
        title: `Strona WWW — ${parsed.company_name}`,
        crm_client_id: crmClientId,
        website_client_id: data.id,
        service_type: "strona_www",
        status: "nowe",
        assigned_to: null,
        deadline,
        description: `${parsed.page_type === "onepage" ? "Onepage" : "Multipage"}${parsed.industry ? ` · ${parsed.industry}` : ""}`,
      });
      projectId = project.id;
    } catch {
      // intranet tables may not exist yet — offer still works
    }

    const baseUrl = getAppBaseUrl(request);

    return NextResponse.json({
      ...data,
      offer_url: getOfferUrl(token, request),
      materials_url: `${baseUrl}/o/${token}/materialy`,
      project_id: projectId,
      crm_client_id: crmClientId,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
