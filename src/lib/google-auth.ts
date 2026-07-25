import { google } from "googleapis";

export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/documents",
];

export function getGoogleOAuthRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}/api/google/oauth/callback`;
}

export function createGoogleOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    getGoogleOAuthRedirectUri(),
  );
}

export function getGoogleAuth() {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const oauth2Client = createGoogleOAuth2Client();

  if (!oauth2Client || !refreshToken) {
    return null;
  }

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

export function isGoogleWorkspaceConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN &&
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
  );
}
