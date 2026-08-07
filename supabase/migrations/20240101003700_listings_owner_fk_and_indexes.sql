-- A foreign key from listings.owner_id to profiles.uid, plus the indexes the
-- browse query actually needs.
--
-- `listings.owner_id` held a user id with nothing enforcing that the user
-- existed. Two consequences, one of which is a bug and one of which is a
-- missing feature:
--
--   * Integrity. Deleting a profile left its listings pointing at nobody, and
--     the detail page would render a listing with no contactable owner. Today
--     there are zero orphans (85 of 85 resolve), which is exactly why this is
--     the right moment to add the constraint — it will never validate cheaper.
--
--   * Discoverability. PostgREST derives its embedding graph from foreign keys,
--     so `select=...,profiles(verified)` failed with PGRST200 "no relationship
--     found". Without it, showing whether a host is identity-verified on a
--     browse card would take one extra round trip per card.
--
-- ON DELETE SET NULL rather than CASCADE, deliberately. A listing is content the
-- platform moderated and other users may have saved or messaged about; deleting
-- an account should orphan it for review, not silently destroy it. `owner_id` is
-- already nullable, and the browse query already tolerates a null owner.

alter table public.listings drop constraint if exists listings_owner_id_fkey;

alter table public.listings
  add constraint listings_owner_id_fkey
  foreign key (owner_id) references public.profiles (uid)
  on delete set null;

-- The FK column itself. Postgres indexes the referenced side (profiles.uid is
-- the primary key) but NOT the referencing side, so without this every profile
-- delete triggers a sequential scan of listings to enforce the constraint, and
-- "listings by this owner" — which is what My Listings runs — does the same.
create index if not exists listings_owner_id_idx
  on public.listings (owner_id);

-- The browse query's actual shape: filter on status, order by created_at desc.
-- `status` and `created_at` were already indexed SEPARATELY, which lets Postgres
-- use one and then sort, or bitmap-and the two. This composite serves the filter
-- and the ordering from a single scan. The rest of the indexes below turned out
-- to already exist — recorded here so the set is declared in one place.
create index if not exists listings_status_created_at_idx
  on public.listings (status, created_at desc)
  where removed = false;

-- The university filter, which is the primary way students narrow the list and
-- the one the university hub links into.
create index if not exists listings_university_idx
  on public.listings (university)
  where university is not null and university <> '';

-- The city fallback branch of that same filter (listings with no university).
create index if not exists listings_city_idx
  on public.listings (city);

notify pgrst, 'reload schema';
