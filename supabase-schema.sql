create extension if not exists pgcrypto;

create table if not exists public.profiles (
  uid text primary key,
  email text,
  full_name text not null default '',
  age int not null default 18,
  gender text not null default 'prefer_not_to_say',
  university text not null default '',
  occupation text not null default '',
  min_budget int not null default 0,
  max_budget int not null default 0,
  preferred_move_in_date timestamptz,
  lifestyle jsonb not null default '{}'::jsonb,
  onboarding_complete boolean not null default false,
  looking_for_apartment boolean not null default true,
  photo_url text,
  bio text not null default '',
  role text not null default 'user',
  verified boolean not null default false,
  profile_completion int not null default 0,
  favorite_listing_ids text[] not null default array[]::text[],
  favorite_roommate_ids text[] not null default array[]::text[],
  viewed_listing_ids text[] not null default array[]::text[],
  contacted_listing_ids text[] not null default array[]::text[],
  banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists looking_for_apartment boolean not null default true;
alter table public.profiles add column if not exists favorite_roommate_ids text[] not null default array[]::text[];
alter table public.profiles add column if not exists viewed_listing_ids text[] not null default array[]::text[];
alter table public.profiles add column if not exists contacted_listing_ids text[] not null default array[]::text[];
alter table public.profiles add column if not exists banned boolean not null default false;

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  title text not null,
  description text not null,
  property_type text not null,
  listing_type text not null,
  monthly_rent int not null,
  deposit_required boolean not null default false,
  deposit_amount int not null default 0,
  city text not null,
  district text not null default '',
  address text not null,
  bedrooms int not null default 1,
  bathrooms numeric not null default 1,
  available_from timestamptz not null,
  amenities text[] not null default array[]::text[],
  preferences jsonb,
  photo_urls text[] not null default array[]::text[],
  removed boolean not null default false,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  bucket text not null,
  path text not null unique,
  public_url text not null,
  kind text not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_ids text[] not null default array[]::text[],
  listing_id uuid,
  listing_title text,
  last_message text,
  last_message_at timestamptz,
  unread_counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id text not null,
  text text not null default '',
  image_url text,
  read_by text[] not null default array[]::text[],
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id text not null,
  target_id text not null,
  target_type text not null,
  reason text not null,
  details text not null default '',
  status text not null default 'open',
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listings drop constraint if exists monthly_rent_range;
alter table public.listings
  add constraint monthly_rent_range check (monthly_rent >= 0 and monthly_rent <= 10000000);

create index if not exists listings_owner_id_idx on public.listings(owner_id);
create index if not exists listings_city_idx on public.listings(city);
create index if not exists images_owner_id_idx on public.images(owner_id);
create index if not exists conversations_listing_id_idx on public.conversations(listing_id);
create index if not exists messages_conversation_id_idx on public.messages(conversation_id);
