-- Privilege-escalation hardening (CRITICAL).
--
-- The owner RLS policies (update_profiles_owner, update_listings_owner) let a
-- signed-in user write their own row, but RLS cannot restrict WHICH columns an
-- INSERT/UPDATE touches. Without column-level control a user could bypass the
-- app and PATCH/POST PostgREST directly (public anon key + their own JWT) to set
-- trust/moderation columns on their own row:
--
--   • profiles.role = 'TimaEra'        -> full admin panel + admin APIs
--   • profiles.verified = true         -> fake identity-verified badge
--   • profiles.banned/suspended = false-> un-ban / un-suspend themselves
--   • profiles.featured = true         -> self-promote onto the home page
--   • listings.removed/status/archived -> un-hide / self-approve a moderated listing
--
-- WHY THE PREVIOUS VERSION OF THIS FILE DID NOT WORK
-- --------------------------------------------------
-- It issued `revoke insert (col), update (col) ... from anon, authenticated`.
-- Supabase bootstraps every project with `grant all on all tables in schema
-- public to anon, authenticated`, and a column-level REVOKE does NOT subtract
-- from an existing TABLE-level grant. The statements succeeded and changed
-- nothing, so production still allowed the writes above.
--
-- This was NOT covered by the guard_privileged_columns trigger either: that
-- trigger is BEFORE UPDATE only, so an INSERT carrying role='TimaEra' (a freshly
-- signed-up user who has no profile row yet) escalated straight to admin.
--
-- THE WORKING PATTERN: drop the table-wide write grant, then re-grant only the
-- columns the browser client legitimately writes (mirrors toProfilePayload() in
-- src/lib/data/profiles.ts and the listing form fields). Privileged columns are
-- then writable ONLY by the service-role client, which bypasses column grants
-- and is used by every admin/moderation flow. Combined with the BEFORE UPDATE
-- trigger this closes both the INSERT and UPDATE paths.
--
-- Idempotent: revoke/grant are declarative, so re-running is safe.

-- ---------------------------------------------------------------- profiles --
revoke insert, update on public.profiles from anon, authenticated;

grant insert (
  uid, email, full_name, age, gender, university, occupation,
  min_budget, max_budget, preferred_move_in_date, lifestyle,
  onboarding_complete, looking_for_apartment, photo_url, bio,
  telegram, phone, contacts_hidden, profile_completion,
  favorite_listing_ids, favorite_roommate_ids,
  viewed_listing_ids, contacted_listing_ids,
  created_at, updated_at
) on public.profiles to authenticated;

grant update (
  uid, email, full_name, age, gender, university, occupation,
  min_budget, max_budget, preferred_move_in_date, lifestyle,
  onboarding_complete, looking_for_apartment, photo_url, bio,
  telegram, phone, contacts_hidden, profile_completion,
  favorite_listing_ids, favorite_roommate_ids,
  viewed_listing_ids, contacted_listing_ids,
  created_at, updated_at
) on public.profiles to authenticated;

-- ---------------------------------------------------------------- listings --
revoke insert, update on public.listings from anon, authenticated;

grant insert (
  id, owner_id, title, description, property_type, listing_type,
  monthly_rent, deposit_required, deposit_amount, city, district, address,
  bedrooms, bathrooms, available_from, amenities, preferences, photo_urls,
  university, category_id, lat, lng, latitude, longitude,
  created_at, updated_at
) on public.listings to authenticated;

grant update (
  id, owner_id, title, description, property_type, listing_type,
  monthly_rent, deposit_required, deposit_amount, city, district, address,
  bedrooms, bathrooms, available_from, amenities, preferences, photo_urls,
  university, category_id, lat, lng, latitude, longitude,
  created_at, updated_at
) on public.listings to authenticated;

revoke insert, update, delete on public.listings from anon;
