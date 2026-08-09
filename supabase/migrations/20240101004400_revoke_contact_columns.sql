-- Step 3 of 3: close the hole 20240101004200 built the door for.
--
-- `authenticated` loses column-level SELECT on profiles.phone / .telegram /
-- .email. After this, the harvesting request
--   GET /rest/v1/profiles?select=phone,telegram,email
-- fails with 42501 for an ordinary signed-in user instead of returning the
-- whole membership, and contact reveal goes through get_profile_contacts(),
-- which enforces contacts_hidden / banned / suspended per row.
--
-- ORDERING MATTERS. This must not be applied before the application that calls
-- the RPC is live, or every signed-in visitor loses contact reveal at once.
--
-- NOT AFFECTED:
--   * anon — never had these columns (20240101000300_contact_privacy.sql).
--   * service_role — bypasses RLS and column grants. getListingOwnerServer()
--     and the admin routes read contacts through the admin client and keep
--     working unchanged.
--   * the owner reading their own contacts — get_profile_contacts() returns
--     them for p.uid = auth.uid() regardless of contacts_hidden.
--
-- REVERSIBLE. To roll back:
--   grant select (phone, telegram, email) on public.profiles to authenticated;

begin;

revoke select (phone) on public.profiles from authenticated;
revoke select (telegram) on public.profiles from authenticated;
revoke select (email) on public.profiles from authenticated;

commit;

notify pgrst, 'reload schema';
