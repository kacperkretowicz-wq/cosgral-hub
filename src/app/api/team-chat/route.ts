import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { getAdminEmail } from "@/lib/auth";
import { TEAM, isTeamMemberId } from "@/lib/team";
import { createTeamMessage, listTeamMessages } from "@/lib/team-chat-store";

const postSchema = z.object({
  body: z.string().min(1).max(4000),
  channel: z.string().optional(),
});

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const data = await listTeamMessages("general");
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const email = await getAdminEmail();
    const member = TEAM.find((m) => m.email.toLowerCase() === email);
    if (!member || !isTeamMemberId(member.id)) {
      return NextResponse.json({ error: "Brak autora" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = postSchema.parse(body);
    const data = await createTeamMessage({
      author_id: member.id,
      body: parsed.body,
      channel: parsed.channel ?? "general",
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
