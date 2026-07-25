# Cosgral Portal — instrukcja wdrożenia

Portal ofert i materiałów klienta dla Cosgral Agency.

## Wymagania

- Node.js 18+
- Konto [Supabase](https://supabase.com) (free tier)
- Konto [Vercel](https://vercel.com) (free tier)
- Opcjonalnie: Google Cloud (Drive API) + OpenAI API

---

## 1. Supabase

1. Utwórz nowy projekt na [supabase.com](https://supabase.com)
2. W **SQL Editor** uruchom plik [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql)
3. W **Authentication → Users** dodaj 2 konta admin:
   - `jakub.gral00@gmail.com` (Jakub)
   - `kacper.kretowicz@op.pl` (Kacper)
   - Kliknij **Add user → Create new user** dla każdego
   - Ustaw hasła i przekaż je wspólnikowi
4. Skopiuj z **Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Google Drive + Docs (materiały klientów — zalecane)

Szczegółowa instrukcja: [GOOGLE-SETUP.md](./GOOGLE-SETUP.md)

1. Wejdź na [Google Cloud Console](https://console.cloud.google.com/)
2. Utwórz projekt **Cosgral Portal**
3. Włącz **Google Drive API** i **Google Docs API** (APIs & Services → Library)
4. Utwórz **Service Account** (APIs & Services → Credentials → Create Credentials)
5. Pobierz plik JSON z kluczem
6. Skopiuj email service account (np. `...@....iam.gserviceaccount.com`)
7. W Google Drive udostępnij główny folder klientów temu emailowi z uprawnieniem **Edytor**:
   - Folder: [Cosgral — materiały klientów](https://drive.google.com/drive/folders/1r7lRmwWpgD89VlIPdybmwHXqPzMUsO6G)
   - ID folderu: `1r7lRmwWpgD89VlIPdybmwHXqPzMUsO6G`
8. Uruchom migrację `supabase/migrations/004_drive_doc_id.sql` w Supabase SQL Editor
9. Ustaw zmienne env (lokalnie i Netlify):
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — email z JSON
   - `GOOGLE_PRIVATE_KEY` — klucz prywatny z JSON (z `\n` jako newline)
   - `GOOGLE_DRIVE_ROOT_FOLDER_ID` — ID folderu

Bez Google Drive pliki trafiają do Supabase Storage (limit 1 GB). Teksty zapisują się w bazie.

---

## 3. OpenAI (inspiracje AI)

1. Utwórz klucz API na [platform.openai.com](https://platform.openai.com)
2. Ustaw `OPENAI_API_KEY=sk-...`

Bez klucza używana jest wbudowana lista fallback inspiracji.

---

## 4. Lokalny development

```bash
cp .env.example .env.local
# Uzupełnij wartości w .env.local

npm install
npm run dev
```

Aplikacja: [http://localhost:3000](http://localhost:3000)

- Panel admin: `/admin/login`
- Generator: `/admin/generator`

---

## 5. Deploy na Vercel

1. Wypchnij repo na GitHub
2. Połącz z [vercel.com](https://vercel.com) → Import Project
3. Dodaj wszystkie zmienne z `.env.example` w **Settings → Environment Variables**
4. Ustaw `NEXT_PUBLIC_APP_URL` na URL Vercel (np. `https://cosgral-portal.vercel.app`)
5. Deploy

Opcjonalnie: podpięcie domeny `portal.cosgral.pl` w Vercel → Settings → Domains.

---

## Użytkowanie

1. Zaloguj się na `/admin/login`
2. **Wygeneruj formularz** — wpisz nazwę firmy, branżę, typ strony, deadline
3. Skopiuj link oferty i wyślij klientowi
4. Klient otwiera link → czyta ofertę → klika **Prześlij materiały**
5. Klient wypełnia sekcje i wgrywa pliki
6. W dashboardzie (`/admin`) podglądasz przesłane materiały i linki do Drive

---

## Struktura folderów Google Drive

Przy generowaniu oferty tworzone są automatycznie:

```
{Root Folder}/
└── {Nazwa Firmy}/
    ├── Sekcja Główna (Hero Section)
    ├── O nas / O marce
    ├── Oferta (Usługi)
    ├── Portfolio — TOP Case Studies
    ├── Portfolio — Pełna lista realizacji
    ├── Logotypy & Opinie
    └── Branding
```
