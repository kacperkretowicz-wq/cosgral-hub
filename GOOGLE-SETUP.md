# Google Drive + Docs — konfiguracja Cosgral Hub (OAuth 2.0)

Materiały klientów (pliki → Drive, teksty → Google Doc) wymagają OAuth 2.0 Client ID.

## 1. Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com/) → projekt **Cosgral Portal**
2. **APIs & Services → Library** → włącz:
   - **Google Drive API**
   - **Google Docs API**
3. **Credentials → Create Credentials → OAuth client ID**
   - Typ: **Web application**
   - **Authorized redirect URIs:**
     - `https://cosgralhub.netlify.app/api/google/oauth/callback`
     - `http://localhost:3000/api/google/oauth/callback` (dev)
4. Skopiuj **Client ID** i **Client secret**

## 2. Zmienne środowiskowe (Netlify)

Site → **Environment variables**:

```env
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_DRIVE_ROOT_FOLDER_ID=1r7lRmwWpgD89VlIPdybmwHXqPzMUsO6G
GOOGLE_REFRESH_TOKEN=...   ← krok 3
```

Zaznacz **Contains secret values** dla `GOOGLE_CLIENT_SECRET` i `GOOGLE_REFRESH_TOKEN`.

## 3. Jednorazowa autoryzacja (refresh token)

Po deploy z `CLIENT_ID` + `CLIENT_SECRET`:

1. Otwórz: `https://cosgralhub.netlify.app/api/google/oauth/authorize`
2. Zaloguj się kontem Google, które ma dostęp do folderu Drive
3. Skopiuj **refresh token** ze strony callback
4. Dodaj jako `GOOGLE_REFRESH_TOKEN` na Netlify
5. **Deploys → Clear cache and deploy site**

Folder Drive musi należeć do konta użytego przy autoryzacji (lub być udostępniony temu kontu).

## 4. Supabase — migracja

W **SQL Editor** uruchom:

`supabase/migrations/004_drive_doc_id.sql`

## Struktura w Drive (automatyczna)

```
Cosgral — materiały klientów/
  Juicy Events materiały/          ← folder klienta
    Juicy Events materiały         ← Google Doc z tekstami
    Sekcja Główna (Hero Section)/  ← podfolder na pliki
    O nas / O marce/
    ...
```
