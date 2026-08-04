-- Owner access to their own listings.
--
-- `select_listings_public` only exposes rows that are live:
--     removed IS NOT TRUE AND archived IS NOT TRUE AND status = 'approved'
--
-- That is right for the public browse pages and wrong for the person who wrote
-- the listing: an owner could not read their own draft, their own archived
-- listing, or anything a moderator had taken down — so a "My Listings" page had
-- no way to show them. This adds the missing half rather than loosening the
-- public rule, which stays exactly as it is.
--
-- Policies are OR-ed, so a live listing is still visible to everyone and the
-- owner additionally sees their non-live rows. Nobody gains access to anyone
-- else's.
--
-- DELETE gets its own owner policy for the same reason: the table-level grant
-- already existed, but with no DELETE policy RLS denied every attempt, so a user
-- could not remove their own listing at all.
--
-- Deliberately NOT granted here: `archived`, `removed` and `status` remain
-- outside the authenticated column grants (see 20240101000400). They are
-- moderation state, and letting a user write `status` directly would let anyone
-- self-approve. Archiving therefore goes through a server route that checks
-- ownership and uses the service-role client — see src/app/api/my-listings.
--
-- Idempotent.

drop policy if exists select_listings_owner on public.listings;
create policy select_listings_owner
  on public.listings for select
  using (owner_id = (auth.uid())::text);

drop policy if exists delete_listings_owner on public.listings;
create policy delete_listings_owner
  on public.listings for delete
  using (owner_id = (auth.uid())::text);
