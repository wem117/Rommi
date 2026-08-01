-- Migration ledger (process fix).
--
-- Production had NO supabase_migrations.schema_migrations table: every migration
-- had been pasted into the SQL editor by hand, with nothing recording what had
-- actually run. The result was silent drift — some files applied, others not, and
-- no way to tell which without introspecting the live catalog. That is how a
-- no-op privacy migration ("applied", but ineffective) went unnoticed.
--
-- Creating the table Supabase CLI expects makes `supabase db push` authoritative
-- from here on: it records each version it applies and skips what is already
-- recorded.
--
-- NOTE for the first run against THIS database: the objects from earlier
-- migrations already exist, and every migration in this repo is idempotent
-- (`if not exists` / `create or replace` / declarative grants), so re-applying
-- them is safe. Alternatively, mark the already-applied ones without re-running:
--   supabase migration repair --status applied <version> ...
--
-- Idempotent.

create schema if not exists supabase_migrations;

create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text,
  created_by text,
  idempotency_key text unique
);

-- The ledger is infrastructure metadata: never expose it through PostgREST.
revoke all on schema supabase_migrations from anon, authenticated;
revoke all on supabase_migrations.schema_migrations from anon, authenticated;
