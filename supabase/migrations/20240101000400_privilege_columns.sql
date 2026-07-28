-- Privilege-escalation hardening (CRITICAL).
--
-- The owner RLS policies (update_profiles_owner, update_listings_owner) let a
-- signed-in user update their own row, but RLS cannot restrict WHICH columns.
-- Because the anon/authenticated roles hold table-wide UPDATE/INSERT grants, a
-- user could bypass the app and PATCH PostgREST directly (public anon key + their
-- own JWT) to set privileged columns on their own row:
--
--   • profiles.role = 'admin'      -> full admin panel + admin APIs
--   • profiles.verified = true     -> fake identity-verified badge
--   • profiles.banned = false      -> unban / unsuspend themselves
--   • profiles.featured = true     -> self-promote onto the home page
--   • listings.featured/status/removed -> self-feature, self-approve, un-hide
--
-- Fix: revoke column-level INSERT/UPDATE on these trust/moderation columns from
-- anon and authenticated. Legitimate self-service writes (name, bio, budget,
-- lifestyle, photos, contacts, favorites, onboarding flags) are untouched.
-- Every admin/moderation flow writes these columns through the service-role
-- client, which bypasses column grants — so nothing legitimate breaks.
--
-- Run once in the Supabase SQL editor. Idempotent; skips columns that don't exist.

do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('profiles', 'role'),
      ('profiles', 'verified'),
      ('profiles', 'verified_at'),
      ('profiles', 'banned'),
      ('profiles', 'banned_at'),
      ('profiles', 'suspended'),
      ('profiles', 'suspended_at'),
      ('profiles', 'featured'),
      ('profiles', 'featured_position'),
      ('profiles', 'roommate_status'),
      ('listings', 'featured'),
      ('listings', 'featured_position'),
      ('listings', 'status'),
      ('listings', 'removed'),
      ('listings', 'removed_at'),
      ('listings', 'archived')
    ) as t(tbl, col)
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = spec.tbl and column_name = spec.col
    ) then
      execute format('revoke insert (%I), update (%I) on public.%I from anon, authenticated;',
                     spec.col, spec.col, spec.tbl);
    end if;
  end loop;
end $$;
