import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { validatePortalSession, createPortalFile } from "@/lib/portal-db";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const BUCKET = "client-materials";
const MAX_SIZE = 200 * 1024 * 1024; // 200 MB — increased for mobile videos

// Accept ALL image and video MIME types (covers iOS .mov / video/quicktime,
// HEVC, Android WebM, etc.). Unknown types from mobile browsers are also
// allowed as long as they start with "image/" or "video/".
function isAllowedType(mime: string): boolean {
  if (!mime) return false;
  // Explicit allow-list for non-image/video types
  if (mime === "application/pdf") return true;
  // Accept all image/* and video/* — this handles:
  //   video/quicktime  (.mov  — iPhone default)
  //   video/mp4        (.mp4  — H.264 / HEVC)
  //   video/hevc       (.mp4  — HEVC alt label)
  //   video/x-m4v      (.m4v  — Apple TV)
  //   video/webm       (.webm — Android/Chrome)
  //   video/ogg        (.ogv)
  //   video/mpeg       (.mpeg)
  //   image/jpeg, image/heic, image/png, image/webp, image/gif, etc.
  if (mime.startsWith("image/")) return true;
  if (mime.startsWith("video/")) return true;
  return false;
}

// Friendly label for error messages
function mimeLabel(mime: string): string {
  if (mime.startsWith("video/")) return "wideo";
  if (mime.startsWith("image/")) return "zdjęcie";
  if (mime === "application/pdf") return "PDF";
  return mime;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: Request) {
  // Resolve caller — admin or portal client
  let caller: { sender: "admin" | "client"; name: string } | null = null;
  let crm_client_id_from_session: string | null = null;

  const adminAuth = await requireAdmin();
  if (!("error" in adminAuth)) {
    caller = { sender: "admin", name: "Cosgral" };
  } else {
    const cookieStore = await cookies();
    const token = cookieStore.get("portal_session")?.value;
    if (token) {
      const session = await validatePortalSession(token);
      if (session) {
        caller = { sender: "client", name: session.requester_name };
        crm_client_id_from_session = session.crm_client_id;
      }
    }
  }

  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const crm_client_id =
    (formData.get("crm_client_id") as string | null) ?? crm_client_id_from_session;

  if (!file) return NextResponse.json({ error: "Brak pliku" }, { status: 400 });
  if (!crm_client_id) return NextResponse.json({ error: "Brak crm_client_id" }, { status: 400 });

  // Client can only upload to their own catalog
  if (caller.sender === "client" && crm_client_id_from_session !== crm_client_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Plik przekracza 200 MB" }, { status: 400 });
  }

  // Resolve MIME type — mobile browsers sometimes report empty type for .mov files
  let mimeType = file.type || "";
  if (!mimeType) {
    // Infer from extension as fallback
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const extMap: Record<string, string> = {
      mov: "video/quicktime",
      mp4: "video/mp4",
      m4v: "video/x-m4v",
      webm: "video/webm",
      mpeg: "video/mpeg",
      mpg: "video/mpeg",
      avi: "video/x-msvideo",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      heic: "image/heic",
      heif: "image/heif",
      pdf: "application/pdf",
    };
    mimeType = extMap[ext] ?? `application/octet-stream`;
  }

  if (!isAllowedType(mimeType)) {
    return NextResponse.json(
      { error: `Niedozwolony typ pliku (${mimeLabel(mimeType)}). Obsługiwane: zdjęcia, wideo, PDF` },
      { status: 400 },
    );
  }

  const supabase = getServiceClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[/\\?%*:|"<>]/g, "-");
  const storagePath = `${crm_client_id}/portal/${Date.now()}-${safeName}`;

  // Ensure bucket exists
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

  if (uploadError) {
    if (
      uploadError.message?.includes("Bucket not found") ||
      uploadError.message?.includes("not found")
    ) {
      const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: MAX_SIZE,
      });
      if (bucketErr && !bucketErr.message?.includes("already exists")) {
        return NextResponse.json({ error: bucketErr.message }, { status: 500 });
      }
      const { error: retry } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: mimeType, upsert: false });
      if (retry) return NextResponse.json({ error: retry.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }
  }

  // Generate signed URL (1 year)
  const { data: signedData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

  const portalFile = await createPortalFile({
    crm_client_id,
    file_name: file.name,
    mime_type: mimeType,
    storage_path: storagePath,
    public_url: signedData?.signedUrl ?? null,
    uploaded_by: caller.sender,
    uploader_name: caller.name,
    size_bytes: file.size,
  });

  return NextResponse.json({ file: portalFile });
}
