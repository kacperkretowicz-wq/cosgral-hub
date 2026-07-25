import { Readable } from "stream";
import { google } from "googleapis";
import { DRIVE_SECTION_FOLDERS } from "./offer-templates";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    return null;
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

function getDrive() {
  const auth = getAuth();
  if (!auth) return null;
  return google.drive({ version: "v3", auth });
}

export function isDriveConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
  );
}

export async function createClientFolder(companyName: string): Promise<{
  folderId: string;
  sectionFolders: Record<string, string>;
} | null> {
  const drive = getDrive();
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!drive || !rootId) return null;

  const safeName = companyName.replace(/[/\\?%*:|"<>]/g, "-");

  const mainFolder = await drive.files.create({
    requestBody: {
      name: safeName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootId],
    },
    fields: "id",
  });

  const folderId = mainFolder.data.id!;
  const sectionFolders: Record<string, string> = {};

  for (const section of DRIVE_SECTION_FOLDERS) {
    const sub = await drive.files.create({
      requestBody: {
        name: section.name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [folderId],
      },
      fields: "id",
    });
    sectionFolders[section.key] = sub.data.id!;
  }

  return { folderId, sectionFolders };
}

export async function uploadFileToDrive(
  folderId: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer,
): Promise<{ fileId: string; webViewLink?: string } | null> {
  const drive = getDrive();
  if (!drive) return null;

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id, webViewLink",
  });

  return {
    fileId: response.data.id!,
    webViewLink: response.data.webViewLink ?? undefined,
  };
}

export function getDriveFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

export function getDriveFileUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
