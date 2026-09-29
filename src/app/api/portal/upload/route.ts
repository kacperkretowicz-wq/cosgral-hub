import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { validatePortalSession, createPortalFile } from "@/lib/portal-db";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const BUCKET = "client-materials";
const MAX_SIZE = 100 * 1024 * 1024; // 100 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "application/pdf",
];

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
    return NextResponse.json({ error: "Plik przekracza 100 MB" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Niedozwolony typ pliku. Obsługiwane: JPG, PNG, WEBP, GIF, MP4, PDF" },
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
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

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
        .upload(storagePath, buffer, { contentType: file.type, upsert: false });
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
    mime_type: file.type,
    storage_path: storagePath,
    public_url: signedData?.signedUrl ?? null,
    uploaded_by: caller.sender,
    uploader_name: caller.name,
    size_bytes: file.size,
  });

  return NextResponse.json({ file: portalFile });
}
