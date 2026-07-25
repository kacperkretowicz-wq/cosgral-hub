import { NextResponse } from "next/server";
import { getDb, isSupabaseConfigured } from "@/lib/db/client";
import { uploadFileToDrive, isDriveConfigured } from "@/lib/google-drive";
import { uploadFileToSupabaseStorage } from "@/lib/supabase-storage";

const MAX_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "video/quicktime",
  "application/postscript",
];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const token = formData.get("token") as string;
    const sectionKey = formData.get("section_key") as string;
    const file = formData.get("file") as File;

    if (!token || !sectionKey || !file) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Plik przekracza limit 50 MB" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Niedozwolony typ pliku" },
        { status: 400 },
      );
    }

    const db = getDb();
    const client = await db.getClientByToken(token);
    if (!client) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    const sectionFolders = client.drive_section_folders ?? {};
    const folderId = sectionFolders[sectionKey] ?? client.drive_folder_id;

    const buffer = Buffer.from(await file.arrayBuffer());
    let driveFileId = `local-${Date.now()}-${file.name}`;

    if (isDriveConfigured() && folderId) {
      const result = await uploadFileToDrive(
        folderId,
        file.name,
        file.type,
        buffer,
      );
      if (result) {
        driveFileId = result.fileId;
      }
    } else if (isSupabaseConfigured()) {
      const result = await uploadFileToSupabaseStorage(
        client.id,
        sectionKey,
        file.name,
        file.type,
        buffer,
      );
      driveFileId = result.fileId;
    } else if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          error:
            "Upload niedostępny — skonfiguruj Supabase Storage lub Google Drive.",
        },
        { status: 503 },
      );
    } else {
      const uploadsDir = `${process.cwd()}/data/uploads/${client.id}/${sectionKey}`;
      const { mkdir, writeFile } = await import("fs/promises");
      const path = await import("path");
      await mkdir(uploadsDir, { recursive: true });
      await writeFile(path.join(uploadsDir, file.name), buffer);
    }

    const data = await db.createFile({
      client_id: client.id,
      section_key: sectionKey,
      drive_file_id: driveFileId,
      file_name: file.name,
      mime_type: file.type,
    });

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const clientId = searchParams.get("client_id");

  try {
    const db = getDb();

    if (clientId) {
      const data = await db.getFiles(clientId);
      return NextResponse.json(data);
    }

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const data = await db.getFilesByToken(token);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
