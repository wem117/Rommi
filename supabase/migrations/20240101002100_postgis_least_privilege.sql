-- Least-privilege cleanup for the PostGIS objects in `public`.
--
-- MUST BE RUN AS `supabase_admin`:
--
--   docker exec -i supabase-db psql -U supabase_admin -v ON_ERROR_STOP=1 -d postgres \
--     < supabase/migrations/20240101002100_postgis_least_privilege.sql
--
-- WHY IT IS SEPARATE FROM 20240101002000
--   That migration runs as `postgres`, which on Supabase is deliberately NOT a
--   superuser. `spatial_ref_sys`, `geometry_columns` and `geography_columns` are
--   owned by `supabase_admin`, and a role can only revoke privileges on objects
--   it owns — so those three emitted "no privileges could be revoked" warnings
--   and kept the full grant set while all eleven application tables dropped to
--   SELECT. Splitting the ownership boundary into its own file makes the
--   required role explicit instead of leaving a silent gap behind warnings
--   nobody reads.
--
-- WHY IT MATTERS
--   `spatial_ref_sys` is a real table, RLS is not enabled on it, and `anon` held
--   TRUNCATE. **RLS does not apply to TRUNCATE**, so no policy could have
--   restrained it. PostgREST never emits TRUNCATE, which is the only reason this
--   was not reachable — a client-side implementation detail standing in for an
--   access control. The other two are views and cannot be written through
--   anyway; they are included so the whole schema states one rule.
--
--   These are read-only reference data (EPSG projections and PostGIS metadata).
--   SELECT is retained because PostGIS itself and any spatial query need it.
--
-- ROLLBACK
--   grant insert, update, delete, truncate, trigger, references
--     on public.spatial_ref_sys, public.geometry_columns, public.geography_columns
--     to anon, authenticated;
--
-- Idempotent.

begin;

revoke insert, update, delete, truncate, trigger, references
  on public.spatial_ref_sys, public.geometry_columns, public.geography_columns
  from anon, authenticated;

commit;
