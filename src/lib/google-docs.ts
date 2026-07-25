import { google } from "googleapis";
import { MATERIAL_SECTIONS } from "./offer-templates";
import { getGoogleAuth, isGoogleWorkspaceConfigured } from "./google-auth";
import { getClientMaterialsFolderName } from "./google-drive";
import type { Submission } from "./types";

function getDocs() {
  const auth = getGoogleAuth();
  if (!auth) return null;
  return google.docs({ version: "v1", auth });
}

function getDrive() {
  const auth = getGoogleAuth();
  if (!auth) return null;
  return google.drive({ version: "v3", auth });
}

export function isDocsConfigured(): boolean {
  return isGoogleWorkspaceConfigured();
}

export function getGoogleDocUrl(docId: string): string {
  return `https://docs.google.com/document/d/${docId}/edit`;
}

export async function createClientDoc(
  companyName: string,
  parentFolderId: string,
): Promise<string | null> {
  const drive = getDrive();
  if (!drive) return null;

  const docName = getClientMaterialsFolderName(companyName);

  const created = await drive.files.create({
    requestBody: {
      name: docName,
      mimeType: "application/vnd.google-apps.document",
      parents: [parentFolderId],
    },
    fields: "id",
  });

  return created.data.id ?? null;
}

type DocBlock = {
  style: "HEADING_1" | "HEADING_2" | "NORMAL_TEXT";
  text: string;
};

function buildDocBlocks(submissionMap: Map<string, string>): DocBlock[] {
  const blocks: DocBlock[] = [
    {
      style: "HEADING_1",
      text: "Materiały od klienta — treści tekstowe",
    },
    {
      style: "NORMAL_TEXT",
      text: "Dokument uzupełniany automatycznie z formularza Cosgral Hub.",
    },
  ];

  for (const section of MATERIAL_SECTIONS) {
    const sectionFields = section.fields.filter((field) => {
      const key = `${section.key}:${field.key}`;
      return Boolean(submissionMap.get(key)?.trim());
    });

    if (sectionFields.length === 0) continue;

    blocks.push({ style: "HEADING_1", text: section.title });

    for (const field of section.fields) {
      const key = `${section.key}:${field.key}`;
      const value = submissionMap.get(key)?.trim();
      if (!value) continue;

      blocks.push({ style: "HEADING_2", text: field.label });
      blocks.push({ style: "NORMAL_TEXT", text: value });
    }
  }

  return blocks;
}

export async function syncClientDoc(
  docId: string,
  submissions: Submission[],
): Promise<void> {
  const docs = getDocs();
  if (!docs) return;

  const submissionMap = new Map<string, string>();
  for (const sub of submissions) {
    submissionMap.set(`${sub.section_key}:${sub.field_key}`, sub.text_content);
  }

  const blocks = buildDocBlocks(submissionMap);
  const fullText = blocks.map((b) => `${b.text}\n`).join("");

  const doc = await docs.documents.get({ documentId: docId });
  const body = doc.data.body?.content ?? [];
  const lastElement = body[body.length - 1];
  const endIndex = (lastElement?.endIndex ?? 1) - 1;

  const requests: object[] = [];

  if (endIndex > 1) {
    requests.push({
      deleteContentRange: {
        range: { startIndex: 1, endIndex },
      },
    });
  }

  if (fullText.length > 0) {
    requests.push({
      insertText: {
        location: { index: 1 },
        text: fullText,
      },
    });

    let cursor = 1;
    for (const block of blocks) {
      const startIndex = cursor;
      const endIndexExclusive = cursor + block.text.length;

      if (block.style !== "NORMAL_TEXT") {
        requests.push({
          updateParagraphStyle: {
            range: {
              startIndex,
              endIndex: endIndexExclusive,
            },
            paragraphStyle: { namedStyleType: block.style },
            fields: "namedStyleType",
          },
        });
      }

      cursor = endIndexExclusive + 1;
    }
  }

  if (requests.length === 0) return;

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests },
  });
}
