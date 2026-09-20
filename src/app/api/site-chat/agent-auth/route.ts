import { NextResponse } from "next/server";
import { z } from "zod";
import {
  agentCookieName,
  agentPinConfigured,
  isAgentPinValid,
} from "@/lib/site-chat";

const schema = z.object({
  pin: z.string().min(1).max(64),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json());
    if (!isAgentPinValid(parsed.pin)) {
      return NextResponse.json({ error: "Zły PIN" }, { status: 401 });
    }
    const res = NextResponse.json({ success: true });
    res.cookies.set(agentCookieName(), agentPinConfigured(), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(agentCookieName(), "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
