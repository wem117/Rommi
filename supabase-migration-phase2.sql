-- Phase 2: connects the public application to the Admin CMS.
-- Run this once in the Supabase SQL editor, after supabase-migration-admin-cms.sql.
-- Safe to re-run (idempotent).

-- 1. Public read access -------------------------------------------------------
-- The original policies required auth.uid() is not null, which meant signed-out
-- visitors got an RLS permission error (not an empty result) browsing /rooms,
-- /roommates, and the home page. This product is a public marketplace — browsing
-- must work for anonymous visitors, matching every other public page's RLS.
drop policy if exists select_listings_authenticated on public.listings;
create policy select_listings_public
  on public.listings
  for select
  using (removed is not true and status = 'approved');

drop policy if exists select_profiles_authenticated on public.profiles;
create policy select_profiles_public
  on public.profiles
  for select
  using (banned is not true);

-- Widen the Phase 1 public site_settings policy: featured limits aren't
-- sensitive and the home page needs them to cap featured listings/roommates.
drop policy if exists select_site_settings_public on public.site_settings;
create policy select_site_settings_public
  on public.site_settings
  for select
  using (key in ('homepage_hero', 'homepage_sections', 'maintenance_mode', 'featured_listings_limit', 'featured_roommates_limit'));

-- 2. Universities: logo, cover image, featured ordering ----------------------
alter table public.universities add column if not exists logo_url text;
alter table public.universities add column if not exists cover_image_url text;
alter table public.universities add column if not exists featured boolean not null default false;
alter table public.universities add column if not exists featured_position int;

create index if not exists universities_featured_idx on public.universities(featured, featured_position);

-- 3. Listings: archive + category reference -----------------------------------
alter table public.listings add column if not exists archived boolean not null default false;
alter table public.listings add column if not exists category_id uuid references public.property_categories(id) on delete set null;

create index if not exists listings_category_id_idx on public.listings(category_id);
create index if not exists listings_archived_idx on public.listings(archived);

-- Re-narrow the public read policy now that "archived" exists: archived
-- listings should disappear from public browsing just like removed ones.
drop policy if exists select_listings_public on public.listings;
create policy select_listings_public
  on public.listings
  for select
  using (removed is not true and archived is not true and status = 'approved');

-- 4. Profiles: suspend (soft, reversible) distinct from ban (hard) -----------
alter table public.profiles add column if not exists suspended boolean not null default false;
alter table public.profiles add column if not exists suspended_at timestamptz;

-- Re-narrow the public read policy now that "suspended" exists: suspended
-- roommates should disappear from public browsing just like banned ones.
drop policy if exists select_profiles_public on public.profiles;
create policy select_profiles_public
  on public.profiles
  for select
  using (banned is not true and suspended is not true);

-- 5. Platform-wide settings (site identity, SEO, social, footer, contact) ----
insert into public.site_settings (key, value) values
  ('platform', '{
    "siteName": "Roomi",
    "logoUrl": "",
    "faviconUrl": "",
    "contactEmail": "",
    "contactPhone": "",
    "socialLinks": {"instagram": "", "telegram": "", "whatsapp": "", "facebook": ""},
    "footerText": "",
    "seoTitle": "",
    "seoDescription": "",
    "analyticsGaId": "",
    "defaultLanguage": "en"
  }')
on conflict (key) do nothing;

-- platform is homepage/site chrome (name, logo, footer, SEO) that every page
-- needs to render, including for signed-out visitors.
drop policy if exists select_site_settings_platform_public on public.site_settings;
create policy select_site_settings_platform_public
  on public.site_settings
  for select
  using (key = 'platform');

-- 6. Seed the university directory ---------------------------------------------
-- Backfills public.universities from the previously-hardcoded UNIVERSITIES list
-- (src/lib/constants/universities.ts) so the admin-managed table has real rows
-- to start from. City values match that file's getUniversityCity() mapping.
-- on conflict (slug) do nothing keeps this safe to re-run after admin edits.
insert into public.universities (name, slug, city, image_url, position, active, featured, featured_position) values
  ('Al-Farabi Kazakh National University', 'al-farabi-kazakh-national-university', 'Almaty', '/universities/kaznu.jpeg', 0, true, true, 0),
  ('KBTU', 'kbtu', 'Almaty', '/universities/kbtu.jpeg', 1, true, true, 1),
  ('SDU University', 'sdu-university', 'Almaty', '/universities/sdu.jpeg', 2, true, true, 2),
  ('Satbayev University', 'satbayev-university', 'Almaty', null, 3, true, false, null),
  ('KIMEP University', 'kimep-university', 'Almaty', '/universities/kimep.jpeg', 4, true, true, 5),
  ('Narxoz University', 'narxoz-university', 'Almaty', null, 5, true, false, null),
  ('Kazakh Ablai Khan University of International Relations and World Languages', 'kazakh-ablai-khan-university-of-international-relations-and-world-languages', 'Almaty', null, 6, true, false, null),
  ('Kazakh National Pedagogical University named after Abai', 'kazakh-national-pedagogical-university-named-after-abai', 'Almaty', null, 7, true, false, null),
  ('Kazakh National Medical University', 'kazakh-national-medical-university', 'Almaty', null, 8, true, false, null),
  ('Turan University', 'turan-university', 'Almaty', null, 9, true, false, null),
  ('International IT University', 'international-it-university', 'Almaty', null, 10, true, false, null),
  ('Kazakh National Agrarian Research University', 'kazakh-national-agrarian-research-university', 'Almaty', null, 11, true, false, null),
  ('Nazarbayev University', 'nazarbayev-university', 'Astana', null, 12, true, true, 3),
  ('L.N. Gumilyov Eurasian National University', 'l-n-gumilyov-eurasian-national-university', 'Astana', '/universities/enu.JPG', 13, true, true, 4),
  ('Astana IT University', 'astana-it-university', 'Astana', '/universities/aitu.jpg', 14, true, false, null),
  ('S. Seifullin Kazakh Agrotechnical University', 's-seifullin-kazakh-agrotechnical-university', 'Astana', null, 15, true, false, null),
  ('Astana Medical University', 'astana-medical-university', 'Astana', null, 16, true, false, null),
  ('M. Auezov South Kazakhstan University', 'm-auezov-south-kazakhstan-university', 'Shymkent', null, 17, true, false, null),
  ('Karaganda Buketov University', 'karaganda-buketov-university', 'Karaganda', null, 18, true, false, null),
  ('Karaganda Technical University', 'karaganda-technical-university', 'Karaganda', null, 19, true, false, null),
  ('K. Zhubanov Aktobe Regional University', 'k-zhubanov-aktobe-regional-university', 'Aktobe', null, 20, true, false, null),
  ('M.Kh. Dulaty Taraz Regional University', 'm-kh-dulaty-taraz-regional-university', 'Taraz', null, 21, true, false, null),
  ('S. Toraighyrov Pavlodar State University', 's-toraighyrov-pavlodar-state-university', 'Pavlodar', null, 22, true, false, null),
  ('Shakarim University Semey', 'shakarim-university-semey', 'Semey', null, 23, true, false, null),
  ('D. Serikbayev East Kazakhstan Technical University', 'd-serikbayev-east-kazakhstan-technical-university', 'Ust-Kamenogorsk', null, 24, true, false, null),
  ('A. Baitursynov Kostanay Regional University', 'a-baitursynov-kostanay-regional-university', 'Kostanay', null, 25, true, false, null),
  ('Atyrau University', 'atyrau-university', 'Atyrau', null, 26, true, false, null),
  ('M. Utemisov West Kazakhstan University', 'm-utemisov-west-kazakhstan-university', 'Oral', null, 27, true, false, null),
  ('M. Kozybayev North Kazakhstan University', 'm-kozybayev-north-kazakhstan-university', 'Petropavlovsk', null, 28, true, false, null)
on conflict (slug) do nothing;

-- 7. Seed property categories (Apartment, House, Dormitory, Studio, Private Room, Shared Room)
insert into public.property_categories (name, slug, icon, position, active) values
  ('Apartment', 'apartment', 'Building2', 0, true),
  ('House', 'house', 'Home', 1, true),
  ('Dormitory', 'dorm', 'GraduationCap', 2, true),
  ('Studio', 'studio', 'DoorOpen', 3, true),
  ('Private Room', 'private_room', 'BedSingle', 4, true),
  ('Shared Room', 'shared_room', 'Users', 5, true)
on conflict (slug) do nothing;
