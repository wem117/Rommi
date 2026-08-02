-- Least-privilege cleanup for the PostgREST-exposed roles.
--
-- CURRENT STATE
--   Every table in `public` carried the full grant set for BOTH `anon` and
--   `authenticated`:
--       SELECT, INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
--   i.e. the result of a broad `GRANT ALL ... TO anon, authenticated`.
--
-- WHY IT MATTERS
--   Row-Level Security is currently the ONLY thing preventing a logged-out
--   visitor — anyone holding the public anon key, which ships in the browser
--   bundle by design — from writing to these tables. That is a single control
--   with no backstop: one policy dropped during a future migration, or one
--   table created with RLS left off, silently becomes world-writable.
--
--   TRUNCATE deserves separate mention: **RLS does not apply to TRUNCATE at
--   all**. No policy can restrain it. Today PostgREST never emits TRUNCATE, so
--   this is not remotely reachable — but the grant is a loaded gun pointed at
--   every table, disarmed only by a client-side implementation detail.
--
-- WHAT THIS CHANGES
--   anon           -> SELECT only. Every write policy in this schema requires a
--                     non-null auth.uid() (verified against pg_policies), and
--                     `anon` by definition never has one, so no anon write can
--                     succeed today. Revoking is therefore a no-op in behaviour
--                     and a real gain in blast radius.
--   authenticated  -> loses only TRUNCATE, TRIGGER and REFERENCES. Its
--                     SELECT/INSERT/UPDATE/DELETE are deliberately untouched,
--                     including the COLUMN-level INSERT/UPDATE on listings and
--                     profiles that 20240101000400_privilege_columns.sql grants
--                     to keep `role`, `is_verified` etc. unwritable. Revoking at
--                     table level here would NOT disturb those column grants,
--                     but we do not go near them regardless.
--
--   PostgREST issues only SELECT/INSERT/UPDATE/DELETE. TRIGGER and REFERENCES
--   are DDL privileges it never uses.
--
-- ROLLBACK
--   GRANT INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
--     ON ALL TABLES IN SCHEMA public TO anon;
--   GRANT TRUNCATE, TRIGGER, REFERENCES
--     ON ALL TABLES IN SCHEMA public TO authenticated;
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public
--     GRANT ALL ON TABLES TO anon;

begin;

-- 1) anon keeps read access only.
revoke insert, update, delete, truncate, trigger, references
  on all tables in schema public from anon;

-- 2) authenticated keeps its data-manipulation rights; only the privileges
--    PostgREST can never use are withdrawn.
revoke truncate, trigger, references
  on all tables in schema public from authenticated;

-- 3) Root cause: without this, the NEXT table created in `public` inherits the
--    same over-broad grants and quietly undoes steps 1-2.
--
--    Default privileges are per-granting-role, so this must be repeated for
--    each role that creates tables here. `postgres` runs the migrations;
--    `supabase_admin` owns the Supabase-managed objects.
alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, trigger, references on tables from anon;
alter default privileges for role postgres in schema public
  revoke truncate, trigger, references on tables from authenticated;

alter default privileges for role supabase_admin in schema public
  revoke insert, update, delete, truncate, trigger, references on tables from anon;
alter default privileges for role supabase_admin in schema public
  revoke truncate, trigger, references on tables from authenticated;

commit;
