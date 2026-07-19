# Database & migrations

Roomi uses **Supabase** (hosted Postgres + Auth + Storage) in production. This
directory supports running Postgres locally via Docker Compose and documents the
migration workflow.

## Local Postgres (Docker Compose)

`docker compose up` starts a `db` service (Postgres 16). Every `.sql` file in
[`db/init/`](./init) runs once, in filename order, the first time the database
volume is created:

- `01_schema.sql` — tables, indexes, and constraints (portable, vanilla Postgres).
- `02_testimonials.sql` — testimonials table.
- `03_admin_cms.sql` — universities, property categories, site settings, and
  moderation/featured columns on listings/profiles.
- `04_phase2.sql` — university logo/cover/featured columns, listing
  archive/category columns, profile suspend columns, platform settings.
- `05_universities.sql` — comprehensive ~58-university directory seed.
- `06_contacts.sql` — telegram/phone/contacts_hidden columns on profiles.
- `07_homepage_stats.sql` — homepage statistics config in site_settings.

To re-run migrations from scratch, drop the volume:

```bash
docker compose down -v && docker compose up --build
```

## Adding a migration

Add a new numbered file to `db/init/`, e.g. `02_add_x.sql`. Keep them ordered and
idempotent (`create table if not exists`, `add column if not exists`, …) so they
are safe to re-apply.

## Supabase (production)

The hosted database additionally needs the Supabase-specific pieces, which are
**not** portable to vanilla Postgres because they reference `auth.uid()` and
Supabase Storage. Run these in the Supabase SQL editor:

1. `../supabase-schema.sql` — same schema as `01_schema.sql`.
2. `../supabase-policies.sql` — Row Level Security policies (Supabase only).
3. `../supabase-migration-university-search-map.sql` — university search support.
4. `../supabase-migration-admin-cms.sql` — admin CMS tables + RLS.
5. `../supabase-migration-phase2.sql` — public read RLS fix, featured/category
   columns, platform settings.
6. `../supabase-migration-universities.sql` — comprehensive university seed.
7. `../supabase-migration-contacts.sql` — profile contact fields.
8. `../supabase-migration-homepage-stats.sql` — homepage statistics config + RLS.

Keep `db/init/01_schema.sql` in sync with `../supabase-schema.sql`.
