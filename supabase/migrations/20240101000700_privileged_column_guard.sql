-- Privileged-column guard trigger (CRITICAL — privilege-escalation / moderation-bypass fix).
--
-- The owner RLS policies (update_profiles_owner, update_listings_owner,
-- update_conversations_participant in supabase-policies.sql) check ROW ownership
-- but RLS cannot restrict WHICH columns an UPDATE touches. So a signed-in user
-- could bypass the app and PATCH PostgREST directly (public anon key + their own
-- JWT) to rewrite trust/moderation columns on their own row:
--
--   • profiles.role = 'admin'/'TimaEra' -> full admin panel + admin APIs
--   • profiles.verified = true          -> fake identity-verified badge
--   • profiles.banned/suspended = false -> un-ban / un-suspend themselves
--   • profiles.featured = true          -> self-promote onto the home page
--   • listings.removed/status/archived  -> un-hide / self-approve a moderated listing
--   • conversations.participant_ids      -> inject a third uid into a 1:1 chat,
--                                            exposing full history to the new party
--
-- Defense: a BEFORE UPDATE trigger that resets every privileged column back to
-- its OLD value unless the caller is the service-role client (the admin/
-- moderation path) or a direct/superuser DB connection (SQL editor, migrations).
--
-- This is the authoritative control. It complements the column-level REVOKE in
-- 11_privilege_columns.sql (which errors on such writes for anon/authenticated);
-- the trigger additionally covers conversations.participant_ids, survives any
-- future re-GRANT, and needs no maintenance when new privileged columns appear
-- (extend the lists below). Run once in the Supabase SQL editor. Idempotent.

create or replace function public.guard_privileged_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  jwt_claims text := current_setting('request.jwt.claims', true);
begin
  -- Bypass for trusted callers:
  --  • no PostgREST JWT context  -> direct/superuser connection (SQL editor, migrations)
  --  • JWT role = service_role   -> the admin client (src/lib/supabase/admin.ts)
  -- Vanilla Postgres (local Docker) has no such GUC, so this returns NEW there.
  if jwt_claims is null or (jwt_claims::jsonb ->> 'role') = 'service_role' then
    return new;
  end if;

  if tg_table_name = 'profiles' then
    new.role := old.role;
    new.verified := old.verified;
    new.verified_at := old.verified_at;
    new.banned := old.banned;
    new.banned_at := old.banned_at;
    new.suspended := old.suspended;
    new.suspended_at := old.suspended_at;
    new.featured := old.featured;
    new.featured_position := old.featured_position;
    new.roommate_status := old.roommate_status;
  elsif tg_table_name = 'listings' then
    new.removed := old.removed;
    new.removed_at := old.removed_at;
    new.archived := old.archived;
    new.status := old.status;
    new.featured := old.featured;
    new.featured_position := old.featured_position;
  elsif tg_table_name = 'conversations' then
    new.participant_ids := old.participant_ids;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_privileged_columns on public.profiles;
create trigger guard_privileged_columns
  before update on public.profiles
  for each row execute function public.guard_privileged_columns();

drop trigger if exists guard_privileged_columns on public.listings;
create trigger guard_privileged_columns
  before update on public.listings
  for each row execute function public.guard_privileged_columns();

drop trigger if exists guard_privileged_columns on public.conversations;
create trigger guard_privileged_columns
  before update on public.conversations
  for each row execute function public.guard_privileged_columns();
