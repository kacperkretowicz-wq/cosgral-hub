import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { TEAM } from "@/lib/team";

const BOOTSTRAP_PASSWORDS: Record<string, string> = {
  "jakub.gral00@gmail.com": "Cosgral2026!Jakub",
  "kacper.kretowicz@op.pl": "Cosgral2026!Kacper",
};

const schema = z.object({
  confirm: z.literal("RESET_ADMINS"),
});

/**
 * Create or reset passwords for Jakub + Kacper.
 * Protected by confirm phrase (not open password guess).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = schema.parse(body);

    if (parsed.confirm !== "RESET_ADMINS") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !secret) {
      return NextResponse.json(
        { error: "Brak kluczy Supabase w env." },
        { status: 400 },
      );
    }

    const supabase = createClient(url, secret, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: string[] = [];

    for (const member of TEAM) {
      const email = member.email.toLowerCase();
      const password = BOOTSTRAP_PASSWORDS[email];
      if (!password) {
        results.push(`${email} — brak hasła bootstrap`);
        continue;
      }

      // Find user (paginate first page is enough for small projects)
      const { data: listed, error: listError } =
        await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });

      if (listError) {
        results.push(`${email} — listUsers: ${listError.message}`);
        continue;
      }

      const existing = listed.users.find(
        (u) => (u.email ?? "").toLowerCase() === email,
      );

      if (existing) {
        const { error } = await supabase.auth.admin.updateUserById(
          existing.id,
          {
            password,
            email_confirm: true,
          },
        );
        if (error) {
          results.push(`${email} — reset błąd: ${error.message}`);
        } else {
          results.push(`${email} — hasło zresetowane`);
        }
        continue;
      }

      const { error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) {
        results.push(`${email} — create błąd: ${error.message}`);
      } else {
        results.push(`${email} — utworzono`);
      }
    }

    const ok = results.every(
      (r) => r.includes("zresetowane") || r.includes("utworzono"),
    );

    return NextResponse.json({
      success: ok,
      users: results,
      message: ok
        ? "Hasła zresetowane. Zaloguj się: jakub.gral00@gmail.com / Cosgral2026!Jakub"
        : "Część operacji nie powiodła się — zobacz users.",
      login: {
        email: "jakub.gral00@gmail.com",
        password: "Cosgral2026!Jakub",
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Podaj { confirm: \"RESET_ADMINS\" }" },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
