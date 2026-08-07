-- Cardiff University Kazakhstan.
--
-- Seeded as a migration rather than typed into the admin panel so the record
-- exists identically in every environment — a university referenced by
-- `listings.university` and `profiles.university` as free text must not be
-- present in production and absent in a fresh database, or the same profile
-- renders with a working campus link on one and a dangling name on the other.
--
-- Idempotent on `slug`, which is the table's unique key. Re-running updates the
-- descriptive fields and deliberately does NOT touch `position`, `featured`,
-- `active` or the count overrides: those are the admin's, and a redeploy must
-- not undo a curation decision made in the panel.

-- The two assets are repo files under `public/universities/`, not Supabase
-- storage objects. A migration must be able to run against an empty project:
-- a storage URL would seed a row pointing at a file nobody had uploaded yet.
-- The logo is the official bilingual lockup, which carries its own red plate
-- and a near-black "Kazakhstan" wordmark that disappears on a dark background —
-- every surface that renders it puts it on white for that reason.
insert into public.universities (
  name, name_ru, name_kz, slug, city, country, type, website, language, description,
  image_url, logo_url, active, position
) values (
  'Cardiff University Kazakhstan',
  'Кардиффский университет Казахстан',
  -- Kazakh uses the Latin name verbatim, as it does for most branch campuses.
  'Cardiff University Kazakhstan',
  'cardiff-university-kazakhstan',
  'Astana',
  'Kazakhstan',
  'International branch campus',
  'https://cardiff.edu.kz/',
  'English',
  'Cardiff University Kazakhstan is Cardiff University''s branch campus in Astana, Kazakhstan.',
  '/universities/cardiff-university-kazakhstan.jpg',
  '/universities/cardiff-university-kazakhstan-logo.png',
  true,
  -- Appended rather than inserted into the middle: `position` orders the public
  -- list, and renumbering the others would silently reorder a curated page.
  coalesce((select max(position) from public.universities), 0) + 1
)
on conflict (slug) do update set
  name        = excluded.name,
  name_ru     = excluded.name_ru,
  name_kz     = excluded.name_kz,
  city        = excluded.city,
  country     = excluded.country,
  type        = excluded.type,
  website     = excluded.website,
  language    = excluded.language,
  description = excluded.description,
  -- Only when the admin has not replaced them from the panel: an uploaded
  -- photo is a curation decision like `featured` and outranks the seed.
  image_url   = coalesce(public.universities.image_url, excluded.image_url),
  logo_url    = coalesce(public.universities.logo_url, excluded.logo_url),
  updated_at  = now();

notify pgrst, 'reload schema';
