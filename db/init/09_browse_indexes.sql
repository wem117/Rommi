-- Indexes for the hottest public browse paths.
-- /rooms sorts by created_at and filters by city/university; /roommates and
-- the university hub pages filter profiles by university + browse flags.
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent).

create index if not exists listings_created_at_idx on public.listings(created_at desc);
create index if not exists listings_university_idx on public.listings(university);
create index if not exists profiles_university_idx on public.profiles(university);
create index if not exists profiles_browse_idx
  on public.profiles(looking_for_apartment, onboarding_complete, created_at desc);
