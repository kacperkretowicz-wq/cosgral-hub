import { NextResponse } from "next/server";
import { getAdminEmail, isAdminAuthenticated } from "./auth";

export async function requireAdmin() {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const email = await getAdminEmail();
  return { email: email ?? "admin@cosgral.pl" };
}
