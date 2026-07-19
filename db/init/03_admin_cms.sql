-- Universities, property categories, site settings, and moderation/featured
-- columns for listings and profiles. Portable subset (no RLS/auth.uid()) of
-- ../../supabase-migration-admin-cms.sql — keep the two in sync.

create table if not exists public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  city text not null default '',
  description text not null default '',
  image_url text,
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists universities_active_position_idx
  on public.universities(active, position);

create table if not exists public.property_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text not null default '',
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists property_categories_active_position_idx
  on public.property_categories(active, position);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (key, value) values
  ('featured_listings_limit', '8'),
  ('featured_roommates_limit', '8'),
  ('maintenance_mode', 'false'),
  ('admin_emails', '["yeraly28.10@gmail.com"]'),
  ('homepage_hero', '{}'),
  ('homepage_sections', '[
    {"key": "hero", "visible": true},
    {"key": "universities", "visible": true},
    {"key": "featured_listings", "visible": true},
    {"key": "featured_roommates", "visible": true},
    {"key": "testimonials", "visible": true},
    {"key": "faq", "visible": true}
  ]')
on conflict (key) do nothing;

alter table public.listings add column if not exists status text not null default 'approved';
alter table public.listings drop constraint if exists listings_status_check;
alter table public.listings
  add constraint listings_status_check check (status in ('pending', 'approved', 'rejected'));

alter table public.listings add column if not exists featured boolean not null default false;
alter table public.listings add column if not exists featured_position int;

create index if not exists listings_status_idx on public.listings(status);
create index if not exists listings_featured_idx on public.listings(featured, featured_position);

alter table public.profiles add column if not exists banned_at timestamptz;
alter table public.profiles add column if not exists verified_at timestamptz;

alter table public.profiles add column if not exists roommate_status text not null default 'approved';
alter table public.profiles drop constraint if exists profiles_roommate_status_check;
alter table public.profiles
  add constraint profiles_roommate_status_check check (roommate_status in ('pending', 'approved', 'rejected'));

alter table public.profiles add column if not exists featured boolean not null default false;
alter table public.profiles add column if not exists featured_position int;

create index if not exists profiles_featured_idx on public.profiles(featured, featured_position);
