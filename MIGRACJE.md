# Migracje Supabase — Cosgral OS

## Szybka ścieżka (zalecana)

1. Zaloguj się do panelu: https://cosgralhub.netlify.app/admin
2. Otwórz **[Setup](/admin/setup)**
3. Wklej **Database password** z Supabase → Settings → Database
4. Kliknij **Uruchom wszystkie migracje (001–008)**

Alternatywa: ustaw `DATABASE_URL` w Netlify (connection string Postgres) i kliknij migrację bez hasła.

Health check (bez hasła): `GET /api/setup/migrate` — pokazuje, które tabele/kolumny już są.

## Pliki

| Plik | Co daje |
|------|---------|
| `001_initial_schema.sql` | clients, submissions, files |
| `002_intranet_schema.sql` | crm_clients, projects, notes, links |
| `003_storage_bucket.sql` | bucket materiałów |
| `004`–`006` | Drive doc, offer_content, offer_text |
| `007_offer_document.sql` | Oferta Cosgral (JSON + offer_ready) |
| `008_agency_os.sql` | finanse zleceń, tasks, leads |

Wszystkie migracje są **idempotentne** — można odpalać ponownie.

## Ręcznie (SQL Editor)

Jeśli auto-migrate nie połączy się z bazą, skopiuj SQL z setupu (po błędzie pojawia się textarea) albo wklej pliki z `supabase/migrations/` w kolejności 001→008:

https://supabase.com/dashboard/project/bduwbnnvhahtcjjxaazv/sql/new

## 007 — oferta Cosgral

```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS offer_document JSONB;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS offer_ready BOOLEAN NOT NULL DEFAULT false;
```

## 008 — harmonogram / leady / finanse

Dodaje `value_pln`, `cost_pln`, `billing_status` na `projects` oraz tabele `tasks` i `leads`. Pełny plik: [`supabase/migrations/008_agency_os.sql`](supabase/migrations/008_agency_os.sql).
