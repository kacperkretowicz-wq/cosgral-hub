import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { getAppBaseUrl } from "@/lib/app-url";
import { TEAM } from "@/lib/team";
import { sendOutboundEmail } from "@/lib/notify";
import {
  createInvite,
  findAdminByEmail,
  isCoreTeamEmail,
  listExtraAdminUsers,
  listInvites,
  removeAdminUser,
  removeInvite,
} from "@/lib/admin-users-store";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const [extras, invites] = await Promise.all([
    listExtraAdminUsers(),
    listInvites(),
  ]);

  return NextResponse.json({
    me: auth.email,
    users: [
      ...TEAM.map((m) => ({
        id: m.id,
        email: m.email.toLowerCase(),
        label: m.label,
        core: true,
        createdAt: null as string | null,
      })),
      ...extras.map((u) => ({
        id: u.id,
        email: u.email,
        label: u.label,
        core: false,
        createdAt: u.createdAt,
        invitedBy: u.invitedBy,
      })),
    ],
    invites: invites.map((i) => ({
      email: i.email,
      label: i.label,
      invitedBy: i.invitedBy,
      createdAt: i.createdAt,
      expiresAt: i.expiresAt,
    })),
  });
}

const inviteSchema = z.object({
  email: z.string().email(),
  label: z.string().min(1).max(60).optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { email, label } = inviteSchema.parse(body);
    const normalized = email.trim().toLowerCase();

    const existing = await findAdminByEmail(normalized);
    if (existing) {
      return NextResponse.json(
        { error: "Ten adres ma już dostęp do Huba." },
        { status: 409 },
      );
    }

    const invite = await createInvite({
      email: normalized,
      label,
      invitedBy: auth.email,
    });

    const base = getAppBaseUrl(request);
    const link = `${base}/admin/invite?token=${invite.token}`;

    const mail = await sendOutboundEmail({
      to: normalized,
      subject: "Zaproszenie do Cosgral Hub",
      body: [
        "Cześć,",
        "",
        `${auth.email} zaprasza Cię do Cosgral Hub.`,
        "",
        "Aby aktywować konto i ustawić hasło, otwórz link (ważny 72h):",
        link,
        "",
        "— Cosgral",
      ].join("\n"),
    });

    return NextResponse.json({
      success: true,
      invite: {
        email: invite.email,
        label: invite.label,
        expiresAt: invite.expiresAt,
      },
      emailSent: mail.ok,
      emailDetail: mail.detail,
      inviteLink: mail.ok ? undefined : link,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Podaj poprawny e-mail." }, { status: 400 });
    }
    return NextResponse.json({ error: "Nie udało się wysłać zaproszenia." }, { status: 500 });
  }
}

const removeSchema = z.object({
  email: z.string().email(),
  /** "user" = konto z dostępem, "invite" = oczekujące zaproszenie */
  kind: z.enum(["user", "invite"]).optional().default("user"),
});

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { email, kind } = removeSchema.parse(body);
    const normalized = email.trim().toLowerCase();

    if (kind === "invite") {
      const result = await removeInvite(normalized);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json({ success: true, kind: "invite" });
    }

    if (normalized === auth.email?.toLowerCase()) {
      return NextResponse.json(
        { error: "Nie możesz usunąć własnego konta." },
        { status: 400 },
      );
    }
    if (isCoreTeamEmail(normalized)) {
      return NextResponse.json(
        { error: "Nie można usunąć konta założyciela (Jakub / Kacper)." },
        { status: 403 },
      );
    }

    const result = await removeAdminUser(normalized);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    // Anuluj ewentualne wiszące zaproszenie dla tego samego maila
    await removeInvite(normalized).catch(() => undefined);
    return NextResponse.json({ success: true, kind: "user" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Podaj poprawny e-mail." }, { status: 400 });
    }
    return NextResponse.json({ error: "Nie udało się usunąć." }, { status: 500 });
  }
}
