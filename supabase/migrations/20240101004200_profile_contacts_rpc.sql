-- Contact reveal moves behind a function that can enforce the rules.
--
-- THE HOLE
-- --------
-- `authenticated` holds column-level SELECT on profiles.phone / .telegram /
-- .email, and the SELECT policy "Profiles are viewable by authenticated users"
-- is USING (true). So one signed-in account could issue
--   GET /rest/v1/profiles?select=full_name,phone,telegram,email
-- and walk away with the contact details of every member — including members
-- who had set "hide my contacts", because `contacts_hidden` is checked only in
-- a React component (components/shared/contact-links.tsx).
--
-- A column grant cannot express "one row at a time, and only if that member
-- allows it". A function can. This is step 1 of 3 and is purely ADDITIVE: the
-- grants stay in place until the application is deployed against this RPC
-- (20240101004400 revokes them), so no running client breaks.
--
-- SECURITY DEFINER because the caller will, by the end of the rollout, have no
-- privilege on these columns at all. Everything the definer's authority is used
-- for is re-checked below.

begin;

create or replace function public.get_profile_contacts(target_uid text)
returns table (phone text, telegram text, email text)
language plpgsql
security definer
-- Pinned: a SECURITY DEFINER function without this resolves unqualified names
-- against the caller's search_path, which is how a hostile temp schema hijacks
-- a definer function.
set search_path = public, pg_temp
as $$
declare
  caller uuid := auth.uid();
begin
  -- Anonymous callers get nothing. EXECUTE is not granted to `anon` either;
  -- this is the second lock on the same door.
  if caller is null then
    return;
  end if;

  return query
  select p.phone, p.telegram, p.email
  from public.profiles p
  where p.uid = target_uid
    and (
      -- You can always read your own contacts: the profile editor needs to
      -- populate its own fields, and hiding them from yourself is meaningless.
      p.uid = caller::text
      or (
        p.contacts_hidden is not true
        and p.banned is not true
        and p.suspended is not true
      )
    );
end;
$$;

comment on function public.get_profile_contacts(text) is
  'Contact details for ONE profile. Enforces authentication, contacts_hidden, banned and suspended server-side. Returns zero rows rather than raising, so a hidden profile is indistinguishable from a missing one.';

-- The function is the only intended entry point, so lock down who may call it.
revoke all on function public.get_profile_contacts(text) from public;
revoke all on function public.get_profile_contacts(text) from anon;
grant execute on function public.get_profile_contacts(text) to authenticated;

commit;

notify pgrst, 'reload schema';
