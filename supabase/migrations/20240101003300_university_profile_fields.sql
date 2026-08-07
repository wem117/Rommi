-- Fields a university record needs and the table never had.
--
-- `universities` carried name/slug/city/description/images and nothing else, so
-- a record like Cardiff University Kazakhstan — an international branch campus,
-- English-taught, with its own website and a Russian name — had five facts with
-- nowhere to go. They were being kept in nobody's head.
--
-- TRANSLATIONS. `name` stays the canonical English name: it is what
-- `listings.university` and `profiles.university` store as free text, what the
-- combobox writes, and what the Telegram parser matches against. Renaming it
-- per locale would orphan every row that references it. `name_ru` / `name_kz`
-- are DISPLAY names layered on top, empty meaning "use `name`" — which is
-- correct for the many Kazakhstani universities whose Latin name is used
-- verbatim in all three languages.

begin;

alter table public.universities
  -- Localised display names. Empty string = fall back to `name`.
  add column if not exists name_ru text not null default '',
  add column if not exists name_kz text not null default '',
  add column if not exists country text not null default 'Kazakhstan',
  -- Free text rather than an enum: the sector has more shapes than a closed
  -- list would survive (national, private, branch campus, joint programme).
  add column if not exists type text not null default '',
  add column if not exists website text not null default '',
  -- Language of instruction, which is the single most useful filter for an
  -- international student choosing where to live.
  add column if not exists language text not null default '';

-- A website has to be a URL or nothing; a half-typed domain renders as a broken
-- link on a public page.
alter table public.universities drop constraint if exists universities_website_check;
alter table public.universities
  add constraint universities_website_check
  check (website = '' or website ~* '^https?://[^\s]+$');

commit;

notify pgrst, 'reload schema';
