-- Full-text / fuzzy search indexes (PERFORMANCE fix).
--
-- The /rooms search issues ILIKE '%term%' across title/description/city/
-- district/address. Leading-wildcard ILIKE cannot use a B-tree index, so every
-- search was a sequential scan of the listings table. At scale that pegs DB CPU
-- and blows p95 latency.
--
-- Fix: pg_trgm GIN indexes make %term% ILIKE index-backed. Also index the JSONB
-- preference filters (gender/smoking/pets) used on the browse page.
--
-- Run once in the Supabase SQL editor. Idempotent.

create extension if not exists pg_trgm;

-- Trigram GIN indexes for the ILIKE'd text columns.
create index if not exists listings_title_trgm_idx
  on public.listings using gin (title gin_trgm_ops);
create index if not exists listings_description_trgm_idx
  on public.listings using gin (description gin_trgm_ops);
create index if not exists listings_address_trgm_idx
  on public.listings using gin (address gin_trgm_ops);
create index if not exists listings_district_trgm_idx
  on public.listings using gin (district gin_trgm_ops);

-- JSONB preference filters used by getListings().
create index if not exists listings_pref_gender_idx
  on public.listings ((preferences ->> 'genderPreference'));
create index if not exists listings_pref_smoking_idx
  on public.listings ((preferences ->> 'smoking'));
create index if not exists listings_pref_pets_idx
  on public.listings ((preferences ->> 'pets'));

-- Composite index for the default public browse (approved + visible, newest).
create index if not exists listings_public_browse_idx
  on public.listings (status, removed, archived, created_at desc);

analyze public.listings;
