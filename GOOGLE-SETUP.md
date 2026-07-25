# Google Drive + Docs — konfiguracja Cosgral Hub

Materiały klientów (pliki → Drive, teksty → Google Doc) wymagają Service Account.

## 1. Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com/) → projekt **Cosgral Portal**
2. **APIs & Services → Library** → włącz:
   - **Google Drive API**
   - **Google Docs API**
3. **Credentials → Create Credentials → Service Account**
4. Pobierz JSON → skopiuj:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY`

## 2. Udostępnij folder Drive

1. Otwórz folder: [Cosgral — materiały klientów](https://drive.google.com/drive/folders/1r7lRmwWpgD89VlIPdybmwHXqPzMUsO6G)
2. **Udostępnij** → wklej email service account → rola **Edytor**

## 3. Zmienne środowiskowe

Lokalnie (`.env.local`) i na **Netlify** (Site → Environment variables):

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=cosgral-portal@....iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_ROOT_FOLDER_ID=1r7lRmwWpgD89VlIPdybmwHXqPzMUsO6G
```

Zaznacz **Contains secret values** dla `GOOGLE_PRIVATE_KEY`.

## 4. Supabase — migracja

W **SQL Editor** uruchom:

`supabase/migrations/004_drive_doc_id.sql`

## 5. Redeploy

Netlify → **Deploys → Trigger deploy → Clear cache and deploy site**

## Struktura w Drive (automatyczna)

```
Cosgral — materiały klientów/
  Juicy Events materiały/          ← folder klienta
    Juicy Events materiały         ← Google Doc z tekstami
    Sekcja Główna (Hero Section)/  ← podfolder na pliki
    O nas / O marce/
    ...
```
