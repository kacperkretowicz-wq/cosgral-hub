import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { deletePortalFile } from "@/lib/portal-db";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "client-materials";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  try {
    const storagePath = await deletePortalFile(id);
    // Also remove from Supabase storage
    if (storagePath) {
      await getServiceClient().storage.from(BUCKET).remove([storagePath]);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
