# Wdrożenie Cosgral Hub — linki live + GitHub dla Kacpra

## Dlaczego linki nie działają lokalnie

Linki generowane z `localhost` działają **tylko na Twoim komputerze**. Klient ich nie otworzy.

**Rozwiązanie:** deploy na Vercel + ustawienie `NEXT_PUBLIC_APP_URL` na publiczny adres.

---

## Krok 1 — GitHub (repo dla Ciebie i Kacpra)

W terminalu, w folderze projektu:

```bash
cd "/Users/jakubczupajlo/Documents/CURSOR/OFERTA COSGRAL JUICY"

git init
git add .
git commit -m "Cosgral Hub — wersja gotowa do wdrożenia"

# Utwórz puste repo na github.com (np. cosgral-hub), potem:
git remote add origin https://github.com/jakubgral00-cloud/COSGRAL-HUB.git
git branch -M main
git push -u origin main
```

---

## Krok 2 — Vercel (link live dla klientów)

1. Wejdź na [vercel.com](https://vercel.com) → **Add New Project**
2. Importuj repo z GitHub
3. W **Environment Variables** dodaj (skopiuj z `.env.local`):

| Zmienna | Wartość |
|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://bduwbnnvhahtcjjxaazv.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | twój publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | twój secret key |
| `NEXT_PUBLIC_APP_URL` | **`https://cosgral-hub.vercel.app`** (URL po deploy!) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | opcjonalnie |
| `GOOGLE_PRIVATE_KEY` | opcjonalnie |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | `1HtZichmlL31RY3LKS7Z_P4AbBdpjcy1D` |

4. Kliknij **Deploy**
5. Po deploy skopiuj URL (np. `https://cosgral-hub.vercel.app`) i ustaw go jako `NEXT_PUBLIC_APP_URL` → **Redeploy**

Od tego momentu linki z generatora będą działać u klientów.

---

## Krok 3 — Kto może się zalogować

Tylko konta w **Supabase → Authentication → Users**:

- `jakub.gral00@gmail.com`
- `kacper.kretowicz@op.pl`

Strony `/o/{token}` (oferta klienta) są **publiczne** — bez logowania.

Panel `/admin/*` wymaga logowania.

---

## Dostęp dla Kacpra

### A) Live panel (użytkowanie)

Wyślij Kacprowi:

- URL: `https://TWOJA-DOMENA.vercel.app/admin/login`
- Email: `kacper.kretowicz@op.pl`
- Hasło: (to z Supabase — ustaw w Authentication → Users)

### B) GitHub (edycja kodu)

1. GitHub → repo → **Settings → Collaborators**
2. Dodaj `kacper.kretowicz@op.pl` (lub jego username GitHub) z rolą **Write**
3. Kacper klonuje repo:

```bash
git clone https://github.com/jakubgral00-cloud/COSGRAL-HUB.git
cd COSGRAL-HUB
npm install
cp .env.example .env.local   # Ty mu przekażesz wartości env osobno (np. 1Password)
npm run dev
```

### C) Vercel (opcjonalnie — deploy z jego pushy)

Vercel → Project → **Settings → Members** → zaproś Kacpra.

Każdy push na `main` = automatyczny deploy.

---

## Checklist przed wysłaniem Kacprowi

- [ ] Repo na GitHub
- [ ] Deploy na Vercel działa
- [ ] `NEXT_PUBLIC_APP_URL` ustawione na URL Vercel
- [ ] Migracje SQL w Supabase (001 + 002)
- [ ] Konto Kacpra w Supabase Auth
- [ ] Test: wygeneruj ofertę → skopiuj link → otwórz w incognito (bez logowania)
- [ ] Test: na dole oferty jest przycisk „Prześlij materiały”

---

## Przepływ dla klienta (docelowy)

```
Ty: Generator → Kopiuj link do oferty → WhatsApp/email
        ↓
Klient: otwiera link → czyta ofertę → „Prześlij materiały” → wypełnia formularz
        ↓
Ty: /admin/clients/{token} → widzisz materiały + pliki na Drive
```
