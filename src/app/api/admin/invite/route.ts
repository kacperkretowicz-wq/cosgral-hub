import { NextResponse } from "next/server";
import { z } from "zod";
import {
  consumeInvite,
  getInvite,
  idFromEmail,
  upsertAdminUser,
} from "@/lib/admin-users-store";
import { establishAdminSession } from "@/lib/auth";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return NextResponse.json({ error: "Brak tokenu." }, { status: 400 });
  }
  const invite = await getInvite(token);
  if (!invite) {
    return NextResponse.json(
      { error: "Zaproszenie wygasło lub jest nieprawidłowe." },
      { status: 404 },
    );
  }
  return NextResponse.json({
    email: invite.email,
    label: invite.label,
    expiresAt: invite.expiresAt,
  });
}

const acceptSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8).max(128),
  label: z.string().min(1).max(60).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password, label } = acceptSchema.parse(body);

    const invite = await consumeInvite(token);
    if (!invite) {
      return NextResponse.json(
        { error: "Zaproszenie wygasło lub jest nieprawidłowe." },
        { status: 404 },
      );
    }

    await upsertAdminUser({
      id: idFromEmail(invite.email),
      email: invite.email,
      label: label?.trim() || invite.label,
      localPassword: password,
      invitedBy: invite.invitedBy,
    });

    await establishAdminSession(invite.email, true);

    return NextResponse.json({ success: true, email: invite.email });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Hasło musi mieć min. 8 znaków." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Nie udało się aktywować konta." },
      { status: 500 },
    );
  }
}
