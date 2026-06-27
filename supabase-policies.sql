alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.images enable row level security;
alter table public.conversations enable row level security;

alter table public.listings drop constraint if exists monthly_rent_range;
alter table public.listings
  add constraint monthly_rent_range
  check (monthly_rent >= 0 and monthly_rent <= 10000000);

drop policy if exists select_profiles_authenticated on public.profiles;
drop policy if exists insert_profiles_owner on public.profiles;
drop policy if exists update_profiles_owner on public.profiles;

create policy select_profiles_authenticated
  on public.profiles
  for select
  using (auth.uid() is not null);

create policy insert_profiles_owner
  on public.profiles
  for insert
  with check (uid::text = auth.uid()::text);

create policy update_profiles_owner
  on public.profiles
  for update
  using (uid::text = auth.uid()::text)
  with check (uid::text = auth.uid()::text);

drop policy if exists select_listings_authenticated on public.listings;
drop policy if exists insert_listings_owner on public.listings;
drop policy if exists update_listings_owner on public.listings;

create policy select_listings_authenticated
  on public.listings
  for select
  using (removed is not true);

create policy insert_listings_owner
  on public.listings
  for insert
  with check (owner_id::text = auth.uid()::text);

create policy update_listings_owner
  on public.listings
  for update
  using (owner_id::text = auth.uid()::text)
  with check (owner_id::text = auth.uid()::text);

drop policy if exists insert_images_owner on public.images;
drop policy if exists select_images_owner_or_public on public.images;

create policy insert_images_owner
  on public.images
  for insert
  with check (owner_id::text = auth.uid()::text);

create policy select_images_owner_or_public
  on public.images
  for select
  using (owner_id::text = auth.uid()::text or is_public = true);

drop policy if exists select_conversations_participant on public.conversations;
drop policy if exists insert_conversations_participant on public.conversations;

create policy select_conversations_participant
  on public.conversations
  for select
  using (auth.uid()::text = any(participant_ids));

create policy insert_conversations_participant
  on public.conversations
  for insert
  with check (auth.uid()::text = any(participant_ids));
