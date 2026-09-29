import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "sm-images";
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Brak pliku" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Plik przekracza 20 MB" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Dozwolone formaty: JPG, PNG, WEBP, GIF" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[/\\?%*:|"<>]/g, "-");
    const storagePath = `posts/${Date.now()}-${safeName}`;

    // Ensure bucket exists — if not, try to create it
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      // Bucket might not exist — try creating it first
      if (uploadError.message?.includes("Bucket not found") || uploadError.message?.includes("not found")) {
        const { error: bucketError } = await supabase.storage.createBucket(BUCKET, {
          public: true,
          allowedMimeTypes: ALLOWED_TYPES,
          fileSizeLimit: MAX_SIZE,
        });
        if (bucketError && !bucketError.message?.includes("already exists")) {
          return NextResponse.json({ error: `Nie można utworzyć bucketu: ${bucketError.message}` }, { status: 500 });
        }
        // Retry upload
        const { error: retryError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, buffer, { contentType: file.type, upsert: false });
        if (retryError) {
          return NextResponse.json({ error: retryError.message }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = urlData?.publicUrl ?? null;

    return NextResponse.json({ url: publicUrl, path: storagePath });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
