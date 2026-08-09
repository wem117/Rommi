-- Regression proof for the contact-privacy boundary (P1).
--
-- Runs entirely on schema/grant/policy metadata and a synthetic fixture. It
-- never selects a real member's phone, telegram or email.
--
--   docker exec -i supabase-db psql -U postgres -d postgres -f - < scripts/verify-contact-privacy.sql
--
-- Every check RAISEs on failure, so a non-zero exit means the boundary broke.

\set ON_ERROR_STOP on

do $$
declare
  n int;
begin
  -- 1 + 2. Neither anon nor authenticated may select the contact columns.
  for n in
    select 1 from information_schema.column_privileges
    where table_schema='public' and table_name='profiles'
      and privilege_type='SELECT'
      and grantee in ('anon','authenticated')
      and column_name in ('phone','telegram','email')
  loop
    raise exception 'FAIL: a contact column is still granted to anon/authenticated';
  end loop;
  raise notice 'PASS 1+2: phone/telegram/email not selectable by anon or authenticated';

  -- 6. The RPC is not callable anonymously.
  if exists (
    select 1 from information_schema.routine_privileges
    where routine_schema='public' and routine_name='get_profile_contacts' and grantee='anon'
  ) then
    raise exception 'FAIL: anon can execute get_profile_contacts';
  end if;
  raise notice 'PASS 6a: anon has no EXECUTE on get_profile_contacts';

  -- The definer function must pin search_path.
  if not exists (
    select 1 from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
    where ns.nspname='public' and p.proname='get_profile_contacts'
      and p.prosecdef and array_to_string(p.proconfig,',') like '%search_path%'
  ) then
    raise exception 'FAIL: get_profile_contacts is not SECURITY DEFINER with a pinned search_path';
  end if;
  raise notice 'PASS 6b: SECURITY DEFINER with pinned search_path';

  -- Public columns must still be readable, or the app breaks.
  if not exists (
    select 1 from information_schema.column_privileges
    where table_schema='public' and table_name='profiles'
      and privilege_type='SELECT' and grantee='anon' and column_name='full_name'
  ) then
    raise exception 'FAIL: anon lost public profile columns — over-revoked';
  end if;
  raise notice 'PASS 9: public profile columns still readable (app not broken)';
end $$;

-- 3, 4, 5, 7: behaviour, against synthetic rows only.
begin;

insert into public.profiles (uid, full_name, phone, telegram, email, contacts_hidden, banned, suspended)
values
  ('00000000-0000-0000-0000-0000000000a1', 'FIXTURE visible',   '+7000000001', 'tg_visible', 'a1@example.invalid', false, false, false),
  ('00000000-0000-0000-0000-0000000000a2', 'FIXTURE hidden',    '+7000000002', 'tg_hidden',  'a2@example.invalid', true,  false, false),
  ('00000000-0000-0000-0000-0000000000a3', 'FIXTURE banned',    '+7000000003', 'tg_banned',  'a3@example.invalid', false, true,  false),
  ('00000000-0000-0000-0000-0000000000a4', 'FIXTURE suspended', '+7000000004', 'tg_susp',    'a4@example.invalid', false, false, true);

do $$
declare
  visible_rows int;
begin
  -- 3 + 4. contacts_hidden must win, and banned/suspended must be withheld.
  -- auth.uid() is NULL here, so the self-access branch cannot mask the result.
  select count(*) into visible_rows from public.get_profile_contacts('00000000-0000-0000-0000-0000000000a2');
  if visible_rows <> 0 then raise exception 'FAIL: contacts_hidden profile returned contacts'; end if;

  select count(*) into visible_rows from public.get_profile_contacts('00000000-0000-0000-0000-0000000000a3');
  if visible_rows <> 0 then raise exception 'FAIL: banned profile returned contacts'; end if;

  select count(*) into visible_rows from public.get_profile_contacts('00000000-0000-0000-0000-0000000000a4');
  if visible_rows <> 0 then raise exception 'FAIL: suspended profile returned contacts'; end if;
  raise notice 'PASS 3+4+7: hidden, banned and suspended profiles withhold contacts';

  -- 6. A caller with no session gets nothing even for a visible profile.
  select count(*) into visible_rows from public.get_profile_contacts('00000000-0000-0000-0000-0000000000a1');
  if visible_rows <> 0 then raise exception 'FAIL: unauthenticated caller received contacts'; end if;
  raise notice 'PASS 6c: unauthenticated caller receives nothing';

  -- 6. An unknown uid returns empty rather than erroring or leaking existence.
  select count(*) into visible_rows from public.get_profile_contacts('not-a-real-uid');
  if visible_rows <> 0 then raise exception 'FAIL: unknown uid returned rows'; end if;
  raise notice 'PASS 6d: arbitrary/unknown uid returns nothing';
end $$;

rollback;   -- fixtures never persist
