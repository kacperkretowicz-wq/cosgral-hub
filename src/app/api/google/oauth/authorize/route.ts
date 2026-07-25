import { NextResponse } from "next/server";
import {
  createGoogleOAuth2Client,
  GOOGLE_OAUTH_SCOPES,
} from "@/lib/google-auth";

export async function GET() {
  const oauth2Client = createGoogleOAuth2Client();
  if (!oauth2Client) {
    return NextResponse.json(
      { error: "Ustaw GOOGLE_CLIENT_ID i GOOGLE_CLIENT_SECRET." },
      { status: 503 },
    );
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_OAUTH_SCOPES,
  });

  return NextResponse.redirect(authUrl);
}
