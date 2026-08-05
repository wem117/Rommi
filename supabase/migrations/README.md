# Database migrations

These are the Supabase CLI migrations for Roomi. They apply in filename
(timestamp) order and each is idempotent (safe to re-run).

## Applying

> **Check which database you are about to change before you run anything.**
> Roomi has more than one Supabase instance, and they are easy to confuse
> because both answer to similar-looking URLs and keys:
>
> | | Instance | Used by |
> |---|---|---|
> | **Production** | self-hosted, behind `https://api.roomi.kz` | `roomi.kz`, the admin panel, `telegram-service` |
> | Development | a hosted `*.supabase.co` project | whatever is in your local `.env.local` |
>
> `supabase link --project-ref …` + `db push` (below) talks to a **hosted**
> project. It cannot reach the self-hosted production database. Running only
> that and assuming production was updated is exactly how the `telegram_*`
> tables ended up existing in one instance and not the other, which surfaced as
> a mystifying `404 PGRST205 "Could not find the table … in the schema cache"`
> from `api.roomi.kz` while `SELECT` in a psql session showed the tables
> present. PostgREST was correct; the tables were in the other database.
>
> Quick way to tell which instance has a table, using only the public anon key
> (RLS keeps this from returning any data):
>
> ```bash
> curl -s -o /dev/null -w '%{http_code}\n' \
>   -H "apikey: $ANON_KEY" \
>   "https://api.roomi.kz/rest/v1/telegram_sources?select=id&limit=1"
> ```
>
> `404` = migrations not applied to that database. Anything else = they are.

### Hosted / development instance

```bash
# Link once (project ref from the Supabase dashboard URL):
supabase link --project-ref <your-project-ref>

# Apply everything to the linked remote database:
supabase db push

# Or reset a LOCAL dev database and replay all migrations:
supabase db reset
```

### Self-hosted production (`api.roomi.kz`)

There is no `supabase link` for a self-hosted stack — apply the SQL directly to
the Postgres container on the VPS:

```bash
# on the VPS
docker ps --format '{{.Names}}\t{{.Image}}' | grep -i postgres   # find the DB container
docker exec -i supabase-db psql -v ON_ERROR_STOP=1 -U postgres -d postgres \
  < 20240101002500_telegram_imports.sql
```

Then confirm PostgREST picked the change up:

```bash
docker exec -i supabase-db psql -U postgres -d postgres \
  -c "select table_name from information_schema.tables
      where table_schema='public' and table_name like 'telegram%';"
```

**The Telegram migrations are applied automatically.**
`.github/workflows/deploy-telegram-service.yml` bundles
`supabase/migrations/*telegram*.sql`, applies it to the production Postgres
container on every deploy, and fails the deploy if all three tables are not
present afterwards — so the code and the schema it needs ship together. Every
file is idempotent, so re-applying on each deploy is a no-op.

Migrations *outside* that glob are still applied by hand; if you add one that
production depends on, apply it using the commands above.

## Order & provenance

The files were consolidated from the previously hand-run SQL scripts into a
single ordered history. The order reflects real dependencies:

| # | File | Purpose |
|---|------|---------|
| 00 | `..._schema.sql` | Base tables (profiles, listings, images, conversations, messages, reports, testimonials) |
| 01 | `..._admin_cms.sql` | `site_settings`, `property_categories`, `universities` tables |
| 02 | `..._contacts.sql` | Profile contact columns (telegram, phone) |
| 03 | `..._contact_privacy.sql` | Revoke contact columns from `anon` |
| 04 | `..._privilege_columns.sql` | Revoke trust/moderation columns from `anon`/`authenticated` |
| 05 | `..._policies.sql` | Row Level Security policies |
| 06 | `..._phase2.sql` | Public-read policies, archive/category columns, seed universities & categories |
| 07 | `..._privileged_column_guard.sql` | `guard_privileged_columns` BEFORE UPDATE trigger |
| 08 | `..._universities.sql` | University directory helpers |
| 09 | `..._university_search_map.sql` | University search/map columns |
| 10 | `..._university_stat_overrides.sql` | University stat overrides |
| 11 | `..._homepage_stats.sql` | Homepage stats settings |
| 12 | `..._rename_admin_role.sql` | Admin role rename |
| 13 | `..._browse_indexes.sql` | Indexes for the hot browse paths |
| 14 | `..._atomic_mutations.sql` | Atomic RPCs (favorites, unread, get-or-create conversation) |
| 15 | `..._search_index.sql` | pg_trgm search indexes + JSONB preference indexes |
| 16 | `..._realtime.sql` | Add messages + conversations to the realtime publication |
| 25 | `..._telegram_imports.sql` | `telegram_sources`, `telegram_messages`, `telegram_listings` — Telegram -> AI -> Roomi import pipeline (service-role only; zero RLS policies for anon/authenticated) |
| 26 | `..._telegram_imports_grants.sql` | Explicit `service_role` grants on the three tables (no longer relies on ambient default privileges) + revokes everything from `anon`/`authenticated`, so the scraped contact details are protected by grants as well as RLS |

If your database was provisioned from the older standalone scripts, these are the
same statements — re-running is safe because every file is idempotent.
