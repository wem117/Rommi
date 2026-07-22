-- Admin CMS completion: Universities, Property Categories, Settings, and
-- moderation/featured columns for Listings and Roommates (profiles).
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).

-- 1. Universities -----------------------------------------------------------
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

alter table public.universities enable row level security;

drop policy if exists select_universities_active on public.universities;
create policy select_universities_active
  on public.universities
  for select
  using (active = true);

-- 2. Property categories -----------------------------------------------------
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

alter table public.property_categories enable row level security;

drop policy if exists select_property_categories_active on public.property_categories;
create policy select_property_categories_active
  on public.property_categories
  for select
  using (active = true);

-- 3. Site settings (key/value; admin-managed platform + homepage config) -----
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

alter table public.site_settings enable row level security;

-- Only these keys are safe for public (anon/authenticated) reads — the
-- homepage needs them at render time. admin_emails and featured limits stay
-- readable only via the service-role admin client.
drop policy if exists select_site_settings_public on public.site_settings;
create policy select_site_settings_public
  on public.site_settings
  for select
  using (key in ('homepage_hero', 'homepage_sections', 'maintenance_mode'));

-- Lets a signed-in user check whether *their own* email is in the admin_emails
-- list (used by middleware to gate /admin without exposing the full list).
drop policy if exists select_site_settings_admin_emails_self on public.site_settings;
create policy select_site_settings_admin_emails_self
  on public.site_settings
  for select
  using (key = 'admin_emails' and value ? (auth.jwt() ->> 'email'));

-- 4. Listings: moderation status + featured ordering -------------------------
alter table public.listings add column if not exists status text not null default 'approved';
alter table public.listings drop constraint if exists listings_status_check;
alter table public.listings
  add constraint listings_status_check check (status in ('pending', 'approved', 'rejected'));

alter table public.listings add column if not exists featured boolean not null default false;
alter table public.listings add column if not exists featured_position int;

create index if not exists listings_status_idx on public.listings(status);
create index if not exists listings_featured_idx on public.listings(featured, featured_position);

-- 5. Profiles (roommates): moderation status + featured ordering -------------
-- banned_at/verified_at are written by the existing ban/verify admin routes
-- but were never added to the schema — add them so those routes actually work.
alter table public.profiles add column if not exists banned_at timestamptz;
alter table public.profiles add column if not exists verified_at timestamptz;

alter table public.profiles add column if not exists roommate_status text not null default 'approved';
alter table public.profiles drop constraint if exists profiles_roommate_status_check;
alter table public.profiles
  add constraint profiles_roommate_status_check check (roommate_status in ('pending', 'approved', 'rejected'));

alter table public.profiles add column if not exists featured boolean not null default false;
alter table public.profiles add column if not exists featured_position int;

create index if not exists profiles_featured_idx on public.profiles(featured, featured_position);
