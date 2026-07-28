-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run: every statement is guarded with IF NOT EXISTS.

-- 1. University field on listings (this is what "list a room" and the
--    university-filter feature actually needed to work correctly).
alter table public.listings add column if not exists university text;

-- 2. Coordinates for a future map view (Google Maps JS API or a free
--    alternative like Leaflet/OpenStreetMap - see chat notes). Nullable so
--    existing listings keep working without them.
alter table public.listings add column if not exists lat double precision;
alter table public.listings add column if not exists lng double precision;

-- 3. Saved searches, so a user's filters can be stored and revisited/alerted on.
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.saved_searches enable row level security;

drop policy if exists select_saved_searches_owner on public.saved_searches;
drop policy if exists insert_saved_searches_owner on public.saved_searches;
drop policy if exists delete_saved_searches_owner on public.saved_searches;

create policy select_saved_searches_owner
  on public.saved_searches
  for select
  using (auth.uid() = user_id);

create policy insert_saved_searches_owner
  on public.saved_searches
  for insert
  with check (auth.uid() = user_id);

create policy delete_saved_searches_owner
  on public.saved_searches
  for delete
  using (auth.uid() = user_id);
