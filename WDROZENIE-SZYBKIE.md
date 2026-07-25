# Szybkie wdrożenie online (5–10 min)

Vercel na teamie COSGRAL ma problem ze stuck deployami. **Najszybsza alternatywa: Netlify (darmowe).**

---

## Opcja A — Netlify (polecane)

### 1. Załóż konto
Wejdź na **[netlify.com](https://netlify.com)** → Sign up → **GitHub**.

### 2. Import repo
- **Add new site** → **Import an existing project** → **GitHub**
- Wybierz: `jakubgral00-cloud/COSGRAL-HUB`
- Build settings (powinny być auto z `netlify.toml`):
  - Build: `npm run build`
  - Plugin: `@netlify/plugin-nextjs`

### 3. Environment variables
W **Site configuration → Environment variables** dodaj:

| Klucz | Wartość |
|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://bduwbnnvhahtcjjxaazv.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | z `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | z `.env.local` |
| `GOOGLE_CLIENT_ID` | z Google Cloud |
| `GOOGLE_CLIENT_SECRET` | z Google Cloud |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | `1r7lRmwWpgD89VlIPdybmwHXqPzMUsO6G` |
| `GOOGLE_REFRESH_TOKEN` | po `/api/google/oauth/authorize` |
| `NEXT_PUBLIC_APP_URL` | **po deploy** — URL Netlify, np. `https://cosgral-hub.netlify.app` |

### 4. Deploy
Kliknij **Deploy**. Po 2–3 min masz live URL.

### 5. Ustaw APP_URL i redeploy
Skopiuj URL (np. `https://cosgral-hub.netlify.app`) → wklej jako `NEXT_PUBLIC_APP_URL` → **Trigger deploy** ponownie.

**Gotowe:**
- Panel: `https://TWOJ-URL.netlify.app/admin/login`
- Oferta klienta: `https://TWOJ-URL.netlify.app/o/{token}`

---

## Opcja B — Render (też darmowe)

1. **[render.com](https://render.com)** → Sign up → GitHub
2. **New → Web Service** → repo `COSGRAL-HUB`
3. Runtime: **Node**, Plan: **Free**
4. Build: `npm install && npm run build`
5. Start: `npm start`
6. Dodaj te same env co wyżej
7. Deploy → ustaw `NEXT_PUBLIC_APP_URL` → redeploy

---

## Opcja C — Vercel (jeśli chcesz zostać)

Problem: deploye teamu COSGRAL wiszą w statusie UNKNOWN.

**Ręcznie w dashboardzie:**
1. [vercel.com/cosgral/cosgral-hub](https://vercel.com) → Deployments
2. Anuluj wszystkie „Building/Unknown”
3. **Redeploy** ostatniego commita z GitHub (`c736822`)
4. Sprawdź **Settings → Deployment Protection** — wyłącz dla Production (inaczej klienci widzą ekran logowania Vercel)

Env już ustawione:
- `NEXT_PUBLIC_APP_URL` = `https://cosgral-hub-cosgral.vercel.app`

---

## Po wdrożeniu — test

1. Wejdź na `/admin/login` → zaloguj się
2. Generator → wygeneruj ofertę → **Kopiuj link**
3. Otwórz link w trybie incognito (telefon) — powinna być oferta + przycisk materiałów
