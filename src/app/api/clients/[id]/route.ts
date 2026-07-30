import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { getDb } from "@/lib/db/client";
import { parseDriveFolderId } from "@/lib/drive-folder";
import { getIntranetDb } from "@/lib/intranet-db";
import {
  offerDocumentSchema,
  offerDocumentToPlainText,
} from "@/lib/offer-document";

const updateSchema = z.object({
  offer_text: z.string().min(1).optional(),
  offer_content: z
    .object({
      intro: z.string(),
      closing: z.string(),
      sections: z.array(
        z.object({
          number: z.string(),
          title: z.string(),
          items: z.array(z.string()),
        }),
      ),
    })
    .optional(),
  offer_document: offerDocumentSchema.optional(),
  offer_ready: z.boolean().optional(),
  drive_folder_url: z.string().optional(),
  drive_folder_id: z.string().nullable().optional(),
});

interface Props {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Props) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.parse(body);
    const db = getDb();
    const client = await db.getClientById(id);
    if (!client) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let driveFolderId = parsed.drive_folder_id;
    if (parsed.drive_folder_url !== undefined) {
      const trimmed = parsed.drive_folder_url.trim();
      if (!trimmed) {
        driveFolderId = null;
      } else {
        const parsedId = parseDriveFolderId(trimmed);
        if (!parsedId) {
          return NextResponse.json(
            {
              error:
                "Niepoprawny link do folderu Google Drive. Wklej URL folderu lub jego ID.",
            },
            { status: 400 },
          );
        }
        driveFolderId = parsedId;
      }
    }

    const updates = {
      ...(parsed.offer_text
        ? { offer_text: parsed.offer_text, offer_content: null }
        : {}),
      ...(parsed.offer_content && !parsed.offer_text
        ? { offer_content: parsed.offer_content }
        : {}),
      ...(parsed.offer_document
        ? {
            offer_document: parsed.offer_document,
            offer_text: offerDocumentToPlainText(parsed.offer_document),
            offer_content: null,
          }
        : {}),
      ...(parsed.offer_ready !== undefined
        ? { offer_ready: parsed.offer_ready }
        : {}),
      ...(driveFolderId !== undefined
        ? { drive_folder_id: driveFolderId }
        : {}),
    };

    const data = await db.updateClient(id, updates);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Props) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const db = getDb();
    const client = await db.getClientById(id);
    if (!client) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
      const intranet = getIntranetDb();
      const projects = await intranet.getProjects();
      for (const project of projects) {
        if (project.website_client_id === id) {
          await intranet.deleteProject(project.id);
        }
      }
    } catch {
      // intranet may be unavailable — still delete the offer
    }

    await db.deleteClient(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
