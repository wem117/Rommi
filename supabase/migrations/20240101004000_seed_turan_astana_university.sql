-- Turan-Astana University.
--
-- Two real, separately-accredited private universities share the "Turan"
-- brand: Turan University in Almaty (already seeded) and this one, in Astana.
-- The `universities` table held only the Almaty row, and the Telegram parser's
-- single "туран|turan" alias resolved every mention of either name — and one
-- unrelated Astana street address — to it. Adding this row is the data half of
-- that fix; the parser half is the new Turan-Astana alias in
-- telegram_parser/patterns.py, checked before the (now guarded) bare one.
--
-- Idempotent on `slug`, matching every other university seed in this file set.

insert into public.universities (
  name, name_ru, name_kz, slug, city, country, type, website, language, description, active, position
) values (
  'Turan-Astana University',
  'Университет Туран-Астана',
  -- Kazakh uses the Latin/transliterated form, as it does for most private
  -- universities that were never given a distinct Kazakh-language name.
  'Turan-Astana University',
  'turan-astana-university',
  'Astana',
  'Kazakhstan',
  'Private university',
  'https://tau-edu.kz/',
  'Kazakh, Russian',
  'Turan-Astana University is a private university in Astana, Kazakhstan, distinct from Turan University in Almaty despite the shared name.',
  true,
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
  updated_at  = now();

notify pgrst, 'reload schema';

-- Not part of this migration: the one production listing that was mis-tagged
-- "Turan University" / city=Astana by the old single-alias parser (id
-- 35cda416-9235-4894-9ad9-d3b95811f375, an Astana apartment on Turan Avenue
-- whose text never mentioned any university) was corrected by hand alongside
-- this deploy — cleared to no university, then routed through the same
-- unpublish-incomplete-listings.sql path as every other university-less
-- listing so it does not sit in a different state than its siblings. Not
-- written as SQL here because it targets one specific row by id and would be
-- a silent no-op (correctly) on every other environment, including a fresh
-- database seeded from these migrations.
