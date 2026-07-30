import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { getDb } from "@/lib/db/client";
import { normalizeOptionalDate } from "@/lib/date-utils";
import { getIntranetDb } from "@/lib/intranet-db";
import { getAppBaseUrl, getOfferUrl } from "@/lib/app-url";
import { assertPersistentDb, getDbMode } from "@/lib/persistence";
import {
  buildOfferDocument,
  offerDocumentSchema,
  offerDocumentToPlainText,
  parseOfferDocument,
} from "@/lib/offer-document";
import { getDriveFolderUrl } from "@/lib/google-drive";
import type { Inspiration } from "@/lib/types";

const createSchema = z.object({
  company_name: z.string().min(1),
  industry: z.string().optional(),
  page_type: z.enum(["onepage", "multipage"]),
  deadline: z.string().optional(),
  crm_client_id: z.string().uuid().optional(),
  create_crm: z.boolean().optional(),
  offer_text: z.string().optional(),
  offer_document: offerDocumentSchema.optional(),
  offer_ready: z.boolean().optional(),
  /** Pasted Google Drive folder URL or ID (no auto-create). */
  drive_folder_url: z.string().optional(),
});

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const db = getDb();
    const data = await db.getClients();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
        "X-Cosgral-Db-Mode": getDbMode(),
      },
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
    assertPersistentDb("generowanie oferty");

    const body = await request.json();
    const parsed = createSchema.parse(body);
    const deadline = normalizeOptionalDate(parsed.deadline);
    const token = uuidv4();
    const db = getDb();
    const intranet = getIntranetDb();

    const { parseDriveFolderId } = await import("@/lib/drive-folder");
    const driveFolderId = parsed.drive_folder_url
      ? parseDriveFolderId(parsed.drive_folder_url)
      : null;

    if (parsed.drive_folder_url?.trim() && !driveFolderId) {
      return NextResponse.json(
        {
          error:
            "Niepoprawny link do folderu Google Drive. Wklej URL folderu lub jego ID.",
        },
        { status: 400 },
      );
    }

    // 1) CRM client — required so zlecenie shows on the client card
    let crmClientId = parsed.crm_client_id ?? null;
    if (!crmClientId) {
      if (parsed.create_crm === false) {
        return NextResponse.json(
          {
            error:
              "Wybierz klienta CRM albo zostaw włączone „Utwórz wpis w CRM automatycznie”.",
          },
          { status: 400 },
        );
      }

      const existing = (await intranet.getCrmClients()).find(
        (c) =>
          c.company_name.toLowerCase() === parsed.company_name.toLowerCase(),
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
    } else {
      const crm = await intranet.getCrmClient(crmClientId);
      if (!crm) {
        return NextResponse.json(
          { error: "Wybrany klient CRM nie istnieje." },
          { status: 400 },
        );
      }
    }

    // 2) WWW offer / materials client
    const driveFolderUrl = driveFolderId
      ? getDriveFolderUrl(driveFolderId)
      : null;

    const offerDocument =
      parseOfferDocument(parsed.offer_document) ??
      buildOfferDocument({
        companyName: parsed.company_name,
        industry: parsed.industry,
        pageType: parsed.page_type,
        deadline,
        driveFolderUrl,
      });

    const offerText =
      parsed.offer_text?.trim() || offerDocumentToPlainText(offerDocument);

    const inspirations: Inspiration[] = [];
    const data = await db.createClient({
      company_name: parsed.company_name,
      industry: parsed.industry ?? null,
      page_type: parsed.page_type,
      deadline,
      token,
      drive_folder_id: driveFolderId,
      drive_section_folders: {},
      drive_doc_id: null,
      inspirations,
      offer_content: null,
      offer_text: offerText,
      offer_document: offerDocument,
      offer_ready: parsed.offer_ready ?? true,
      status: "sent",
    });

    // 3) Project linked to CRM + offer
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

    const baseUrl = getAppBaseUrl(request);

    return NextResponse.json({
      ...data,
      offer_url: getOfferUrl(token, request),
      materials_url: `${baseUrl}/o/${token}/materialy`,
      project_id: project.id,
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
