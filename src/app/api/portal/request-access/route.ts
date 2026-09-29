import { NextResponse } from "next/server";
import { getCrmClientBySlug, createAccessRequest } from "@/lib/portal-db";
import { notifyTeam } from "@/lib/notify";
import { z } from "zod";

const schema = z.object({
  slug: z.string().min(1),
  requester_name: z.string().min(1).max(120),
  requester_email: z.string().email().or(z.literal("")).default(""),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }
  const { slug, requester_name, requester_email } = parsed.data;

  const client = await getCrmClientBySlug(slug);
  if (!client) {
    return NextResponse.json({ error: "Katalog nie istnieje" }, { status: 404 });
  }

  const accessReq = await createAccessRequest(
    client.id,
    requester_name,
    requester_email,
  );

  // Notify admin via all channels (push / email / telegram)
  await notifyTeam({
    title: `🔑 Prośba o dostęp do portalu`,
    body: `${requester_name}${requester_email ? ` (${requester_email})` : ""} prosi o dostęp do katalogu: ${client.company_name}`,
    href: `/admin/materialy/${client.id}`,
  }).catch(() => null); // don't fail if notify is not configured

  return NextResponse.json({
    ok: true,
    request_id: accessReq.id,
    message: "Prośba wysłana. Poczekaj na zatwierdzenie przez Cosgral.",
  });
}
