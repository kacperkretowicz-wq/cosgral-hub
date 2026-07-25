import { Readable } from "stream";
import { google } from "googleapis";
import { DRIVE_SECTION_FOLDERS } from "./offer-templates";
import { getGoogleAuth, isGoogleWorkspaceConfigured } from "./google-auth";

function getDrive() {
  const auth = getGoogleAuth();
  if (!auth) return null;
  return google.drive({ version: "v3", auth });
}

export function isDriveConfigured(): boolean {
  return isGoogleWorkspaceConfigured();
}

export function getClientMaterialsFolderName(companyName: string): string {
  const safeName = companyName.replace(/[/\\?%*:|"<>]/g, "-").trim();
  return `${safeName} materiały`;
}

export async function createClientFolder(companyName: string): Promise<{
  folderId: string;
  sectionFolders: Record<string, string>;
} | null> {
  const drive = getDrive();
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!drive || !rootId) return null;

  const folderName = getClientMaterialsFolderName(companyName);

  const mainFolder = await drive.files.create({
    requestBody: {
      name: folderName,
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
