-- Roommate city.
--
-- Roommate listings had no city of their own. `/roommates` inferred one from the
-- university via `getUniversityCity()`, which works only for students whose
-- university is both filled in and recognised — and imported roommate posts
-- routinely have neither. Those profiles were unfilterable by city.
--
-- NULLABLE ON PURPOSE. Every existing roommate predates this column, and a NOT
-- NULL / default would either fail the migration or invent a city for people who
-- never stated one. Readers treat NULL as "not stated" and fall back to the
-- university-derived city, so existing rows keep behaving exactly as before.
--
-- GRANTS ARE REQUIRED, NOT OPTIONAL. 20240101000400 replaced the table-wide
-- write grant on `profiles` with an explicit per-column list, and
-- 20240101002000 removed the last of the broad grants. A new column therefore
-- starts with NO privileges at all: `authenticated` could not write it and
-- `anon` could not read it, so the field would silently never save and never
-- display. The grants below are what make the column usable, and they are
-- deliberately scoped the same way as every other public profile field —
-- readable by anon, writable by its owner, and nothing more.
--
-- Idempotent.

alter table public.profiles add column if not exists city text;

-- Readable publicly: city is public profile data, like university or occupation.
grant select (city) on public.profiles to anon, authenticated;

-- Writable by the owner, exactly like the other self-service profile fields.
-- Row ownership is still enforced by the existing RLS policies; this only says
-- the column is not privileged (unlike role / verified / banned).
grant insert (city), update (city) on public.profiles to authenticated;

comment on column public.profiles.city is
  'City the roommate is looking in. NULL means not stated; readers fall back to the university-derived city.';
