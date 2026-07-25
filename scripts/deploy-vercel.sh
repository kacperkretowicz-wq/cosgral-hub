#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.local ]]; then
  echo "Brak .env.local — skopiuj z .env.example i uzupełnij klucze."
  exit 1
fi

# shellcheck disable=SC1091
source .env.local

echo "→ Deploy Cosgral Hub na Vercel (production)..."

npx vercel link --yes --project cosgral-hub 2>/dev/null || npx vercel link --yes

add_env() {
  local name="$1"
  local value="$2"
  [[ -z "${value:-}" ]] && return 0
  printf '%s' "$value" | npx vercel env add "$name" production --force >/dev/null 2>&1 || true
  printf '%s' "$value" | npx vercel env add "$name" preview --force >/dev/null 2>&1 || true
}

add_env NEXT_PUBLIC_SUPABASE_URL "${NEXT_PUBLIC_SUPABASE_URL:-}"
add_env NEXT_PUBLIC_SUPABASE_ANON_KEY "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"
add_env SUPABASE_SERVICE_ROLE_KEY "${SUPABASE_SERVICE_ROLE_KEY:-}"
add_env GOOGLE_DRIVE_ROOT_FOLDER_ID "${GOOGLE_DRIVE_ROOT_FOLDER_ID:-}"
add_env GOOGLE_SERVICE_ACCOUNT_EMAIL "${GOOGLE_SERVICE_ACCOUNT_EMAIL:-}"
add_env GOOGLE_PRIVATE_KEY "${GOOGLE_PRIVATE_KEY:-}"
add_env OPENAI_API_KEY "${OPENAI_API_KEY:-}"

DEPLOY_URL="$(npx vercel deploy --prod --yes 2>&1 | tee /dev/stderr | grep -Eo 'https://[a-zA-Z0-9.-]+\.vercel\.app' | tail -1)"

if [[ -z "$DEPLOY_URL" ]]; then
  echo "Nie udało się odczytać URL deploy — sprawdź output powyżej."
  exit 1
fi

echo "→ Ustawiam NEXT_PUBLIC_APP_URL=$DEPLOY_URL"
printf '%s' "$DEPLOY_URL" | npx vercel env add NEXT_PUBLIC_APP_URL production --force
printf '%s' "$DEPLOY_URL" | npx vercel env add NEXT_PUBLIC_APP_URL preview --force

echo "→ Redeploy z poprawnym URL..."
npx vercel deploy --prod --yes

echo ""
echo "Gotowe: $DEPLOY_URL"
echo "Panel admin: $DEPLOY_URL/admin/login"
