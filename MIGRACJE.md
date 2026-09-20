# Migracje Supabase — Cosgral OS

## Szybka ścieżka

1. https://cosgralhub.netlify.app/admin/setup
2. Hasło bazy **albo** kopiuj SQL krytyczny do SQL Editora

Health: `GET /api/setup/migrate`

## Pliki

| Plik | Co daje |
|------|---------|
| `001`–`006` | baza + Drive + stare oferty |
| `007` | Oferta Cosgral (`offer_document`) |
| `008` | finanse, tasks, leads |
| `009` | `paid_at` (dokładne MTD) |
| `010` | live chat ze strony (`site_chat_*`, retencja 24h) |

## 010 — live chat (jeśli health pokazuje brak tabel)

```sql
-- pełny plik: supabase/migrations/010_site_chat.sql
```

```sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS paid_at DATE;

CREATE INDEX IF NOT EXISTS idx_projects_paid_at ON projects(paid_at);
```
