import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { getAdminSession } from "@/lib/auth";
import { TEAM } from "@/lib/team";
import {
  deleteTeamMessage,
  getTeamMessage,
  updateTeamMessage,
} from "@/lib/team-chat-store";

const patchSchema = z.object({
  body: z.string().min(1).max(4000),
});

async function resolveAuthorId(): Promise<string | null> {
  const session = await getAdminSession();
  if (!session) return null;
  const core = TEAM.find((m) => m.email.toLowerCase() === session.email.toLowerCase());
  return core?.id ?? session.id;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const authorId = await resolveAuthorId();
    if (!authorId) {
      return NextResponse.json({ error: "Brak sesji" }, { status: 401 });
    }

    const existing = await getTeamMessage(id);
    if (!existing) {
      return NextResponse.json({ error: "Nie znaleziono wiadomości" }, { status: 404 });
    }
    if (existing.author_id !== authorId) {
      return NextResponse.json(
        { error: "Możesz edytować tylko własne wiadomości." },
        { status: 403 },
      );
    }

    const parsed = patchSchema.parse(await request.json());
    const updated = await updateTeamMessage(id, parsed.body);
    if (!updated) {
      return NextResponse.json({ error: "Nie udało się zapisać" }, { status: 400 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Treść wiadomości jest wymagana." }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const authorId = await resolveAuthorId();
    if (!authorId) {
      return NextResponse.json({ error: "Brak sesji" }, { status: 401 });
    }

    const existing = await getTeamMessage(id);
    if (!existing) {
      return NextResponse.json({ error: "Nie znaleziono wiadomości" }, { status: 404 });
    }

    // Każdy zalogowany admin może usunąć dowolną wiadomość w czacie wewnętrznym
    const ok = await deleteTeamMessage(id);
    if (!ok) {
      return NextResponse.json({ error: "Nie udało się usunąć" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
