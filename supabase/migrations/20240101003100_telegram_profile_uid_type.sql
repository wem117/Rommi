-- telegram_listings.profile_uid must match profiles.uid.
--
-- It was declared `uuid` by analogy with `listing_id`, which correctly matches
-- `listings.id`. But `profiles.uid` is TEXT — this schema uses text ids for
-- profiles throughout, which is why `listings.owner_id` is text as well.
--
-- The mismatch does not break writes (PostgREST casts the string on the way in)
-- but it makes the column a dead end: it cannot be joined to `profiles` without
-- a cast, and no foreign key can exist across the two types. So a published
-- roommate draft records which profile it created and nothing enforces that the
-- profile still exists — exactly the guarantee `listing_id` already has through
-- its ON DELETE SET NULL.
--
-- Safe to run on live data: every existing value is a UUID rendered as text.

begin;

alter table public.telegram_listings
  alter column profile_uid type text using profile_uid::text;

alter table public.telegram_listings
  drop constraint if exists telegram_listings_profile_uid_fkey;

-- ON DELETE SET NULL, matching listing_id: deleting the published profile later
-- must not cascade back and destroy the import's audit trail.
alter table public.telegram_listings
  add constraint telegram_listings_profile_uid_fkey
  foreign key (profile_uid) references public.profiles(uid) on delete set null;

create index if not exists telegram_listings_profile_idx
  on public.telegram_listings (profile_uid) where profile_uid is not null;

commit;

notify pgrst, 'reload schema';
