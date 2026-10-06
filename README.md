# Cosgral Hub

Intranet agencji Cosgral — oferty dla klientów, formularz materiałów, CRM, zlecenia.

## Repo

https://github.com/jakubgral00-cloud/COSGRAL-HUB

## Live (produkcja)

Po wdrożeniu na Vercel:

| Co | URL |
|---|---|
| Panel admin (tylko Ty + Kacper) | `https://TWOJA-DOMENA.vercel.app/admin/login` |
| Oferta klienta (publiczna) | `https://TWOJA-DOMENA.vercel.app/o/{token}` |

Logowanie admina: Supabase Auth — konta `jakub.gral00@gmail.com` i `kacper.kretowicz@op.pl`.

## Lokalny dev

```bash
npm install
cp .env.example .env.local   # uzupełnij klucze
npm run dev
```

Panel: http://127.0.0.1:3000/admin/login

## Jak wysłać link klientowi

1. Zaloguj się → **Generator WWW**
2. Wypełnij formularz → **Generuj ofertę**
3. Kliknij **Kopiuj link do oferty dla klienta**
4. Wyślij link (WhatsApp / email)

Klient otwiera link → czyta ofertę → na dole klika **Prześlij materiały**.

## Deploy na Vercel (linki live)

Szczegóły: [WDROZENIE.md](./WDROZENIE.md)

Krótko:
1. Repo na GitHub
2. Import w [vercel.com](https://vercel.com)
3. Ustaw zmienne env z `.env.example`
4. **`NEXT_PUBLIC_APP_URL`** = URL Vercel (np. `https://cosgral-hub.vercel.app`)
5. Deploy

## Dostęp dla Kacpra (GitHub + live)

Instrukcja: [KACPER-START.md](./KACPER-START.md) · [WDROZENIE.md](./WDROZENIE.md#dostęp-dla-kacpra)

## Stack

Next.js 15 · Supabase · Google Drive · Vercel


<!-- Cosgral AI Agent Task [6.10.2026, 12:59:55] -->
> 🤖 **Wdrożenie AI (agent3.cosgral@gmail.com):** Zaktualizuj informacje o zespole w README


<!-- Cosgral 5x Swarm [6.10.2026, 13:14:06] -->
> ⚡ **Rój 5x (KACPER):** Zbuduj nowy modul wyceny z formularzem, backendem i stylami
> - Worker #1 (gemini): Architektura UI & Komponenty → `src/components/AiSwarmFeature.tsx`
> - Worker #2 (claude): Backend API & Logika Danych → `src/app/api/swarm-engine/route.ts`
> - Worker #3 (chatgpt): Walidacja Zod & Typowanie TS → `src/lib/swarm-types.ts`
> - Worker #4 (gemini): Style Tailwind & Liquid Glass → `src/styles/swarm-theme.css`
> - Worker #5 (claude): Testy, Wdrożenie & Dokumentacja → `README.md`
