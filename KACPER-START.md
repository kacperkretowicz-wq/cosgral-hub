# Start dla Kacpra — Cosgral Hub

## 1. Pobierz projekt w Cursor

1. Otwórz **Cursor**
2. **File → Clone from GitHub** (lub `Cmd+Shift+P` → „Git: Clone”)
3. Wklej URL:

```
https://github.com/jakubgral00-cloud/COSGRAL-HUB.git
```

4. Wybierz folder, gdzie ma się pojawić projekt

## 2. Zainstaluj zależności

W terminalu Cursor (w folderze projeku):

```bash
npm install
```

## 3. Konfiguracja `.env.local`

Skopiuj szablon:

```bash
cp .env.example .env.local
```

Jakub prześle Ci wartości kluczy (Supabase, opcjonalnie Google Drive). Wklej je do `.env.local`.

Minimum do działania:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` — lokalnie: `http://127.0.0.1:3000`

## 4. Uruchom lokalnie

```bash
npm run dev
```

Panel admin: http://127.0.0.1:3000/admin/login

Logowanie: `kacper.kretowicz@op.pl` + hasło (Jakub ustawi w Supabase).

## 5. Live wersja (dla klientów)

Publiczne linki ofert działają dopiero po deploy na Vercel — patrz `WDROZENIE.md`.

## 6. Edycja kodu

- Pracujesz na branchu `main` lub tworzysz własny branch
- Push na GitHub → po podpięciu Vercel automatyczny deploy
- Panel admin jest chroniony — tylko Ty i Jakub macie konta w Supabase Auth
