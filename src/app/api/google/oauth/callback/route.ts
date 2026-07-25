import { NextResponse } from "next/server";
import { createGoogleOAuth2Client } from "@/lib/google-auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.json(
      { error: `Google OAuth error: ${error}` },
      { status: 400 },
    );
  }

  if (!code) {
    return NextResponse.json({ error: "Brak kodu autoryzacji." }, { status: 400 });
  }

  const oauth2Client = createGoogleOAuth2Client();
  if (!oauth2Client) {
    return NextResponse.json(
      { error: "Ustaw GOOGLE_CLIENT_ID i GOOGLE_CLIENT_SECRET." },
      { status: 503 },
    );
  }

  const { tokens } = await oauth2Client.getToken(code);
  const refreshToken = tokens.refresh_token;

  if (!refreshToken) {
    return new Response(
      `<html><body style="font-family:sans-serif;max-width:640px;margin:40px auto;padding:0 16px">
        <h1>Brak refresh token</h1>
        <p>Google nie zwrócił refresh token. Odwołaj dostęp aplikacji w
        <a href="https://myaccount.google.com/permissions">Uprawnieniach konta Google</a>
        i spróbuj ponownie.</p>
        <p><a href="/api/google/oauth/authorize">Autoryzuj ponownie</a></p>
      </body></html>`,
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const html = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <title>Google OAuth — Cosgral Hub</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 16px; line-height: 1.5; }
    code, pre { background: #f4f4f5; border-radius: 8px; padding: 12px; display: block; overflow-x: auto; }
    h1 { font-size: 1.5rem; }
  </style>
</head>
<body>
  <h1>Google Drive połączony</h1>
  <p>Skopiuj poniższy refresh token i dodaj go na Netlify jako zmienną
  <strong>GOOGLE_REFRESH_TOKEN</strong> (Contains secret values), potem zrób redeploy.</p>
  <pre>${refreshToken}</pre>
  <p>Po redeploy generowanie ofert i upload materiałów będą trafiać do folderu Drive.</p>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
