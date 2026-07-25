import { NextResponse } from "next/server";
import { z } from "zod";
import { loginAdmin } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, remember } = schema.parse(body);
    const result = await loginAdmin(email, password, remember !== false);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

export async function DELETE() {
  const { logoutAdmin } = await import("@/lib/auth");
  await logoutAdmin();
  return NextResponse.json({ success: true });
}
