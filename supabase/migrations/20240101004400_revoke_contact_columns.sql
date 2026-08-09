-- Step 3 of 3: close the hole 20240101004200 built the door for.
--
-- `authenticated` could read profiles.phone / .telegram / .email for every row,
-- so one signed-in account could harvest the whole membership with
--   GET /rest/v1/profiles?select=phone,telegram,email
-- and `contacts_hidden` — checked only in a React component — did not stop it.
--
-- WHY THIS IS NOT JUST `REVOKE SELECT (phone) ...`
-- ------------------------------------------------
-- That was the first attempt and it silently did nothing. `authenticated` holds
-- a TABLE-level SELECT on public.profiles, and a table grant already covers
-- every column, so there is no column-level grant for the column-level revoke to
-- remove. Postgres reports success and the columns stay readable. The table
-- grant has to go, and a explicit column list re-granted in its place — the same
-- shape 20240101000300_contact_privacy.sql used for `anon`.
--
-- The list is written out rather than computed. A column added later is then
-- unreadable until someone grants it deliberately, which is the correct default
-- for a table that holds phone numbers.
--
-- ORDERING. Apply only once the application calling get_profile_contacts() is
-- live, or contact reveal breaks for every signed-in visitor at once.
--
-- NOT AFFECTED: `anon` (never had these columns), `service_role` (bypasses
-- grants — getListingOwnerServer() and the admin routes are untouched), and a
-- member reading their own contacts (the RPC returns them for uid = auth.uid()).
--
-- REVERSIBLE:  grant select on public.profiles to authenticated;

begin;

revoke select on public.profiles from authenticated;

grant select (
  age, banned, banned_at, bio, city, contacted_listing_ids, contacts_hidden,
  created_at, favorite_listing_ids, favorite_roommate_ids, featured,
  featured_position, full_name, gender, lifestyle, looking_for_apartment,
  max_budget, min_budget, occupation, onboarding_complete, photo_url,
  preferred_move_in_date, profile_completion, role, roommate_status, suspended,
  suspended_at, terms_accepted_at, terms_version, uid, university, updated_at,
  verified, verified_at, viewed_listing_ids
) on public.profiles to authenticated;

commit;

notify pgrst, 'reload schema';
