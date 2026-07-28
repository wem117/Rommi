-- Terms of Service / Privacy Policy acceptance record (legal compliance).
--
-- Registration requires explicit acceptance. We store WHEN it happened and
-- WHICH published version was accepted, so a later policy revision can be
-- re-consented without losing the original record.
--
-- Both columns are written exclusively by the server (service-role client, via
-- POST /api/auth/accept-terms) using the database/server clock and a
-- server-side version constant — never a client-supplied value. They are added
-- to the privileged-column guard below so a signed-in user cannot forge or
-- erase their own acceptance by PATCHing PostgREST directly with their JWT.

alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles add column if not exists terms_version text;

-- Re-declare the guard with the two new privileged columns appended to the
-- profiles branch. Kept byte-identical to 20240101000700 otherwise.
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
    new.terms_accepted_at := old.terms_accepted_at;
    new.terms_version := old.terms_version;
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
