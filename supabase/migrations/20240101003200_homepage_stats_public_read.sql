-- Let the public read the homepage statistics it is shown.
--
-- THE BUG
-- -------
-- `select_site_settings_public` enumerates the keys anon/authenticated may read:
--   homepage_hero, homepage_sections, maintenance_mode,
--   featured_listings_limit, featured_roommates_limit
--
-- `homepage_stats` was never added. The homepage renders through an ANON client
-- (createSupabasePublicServerClient), so the row was invisible to it, the read
-- fell back to DEFAULT_HOMEPAGE_STATS_CONFIG, and the page showed 1,250 / 4,875
-- / 2,150 no matter what an admin saved.
--
-- The admin panel reads the same row through the SERVICE-ROLE client, which
-- bypasses RLS entirely — so the editor showed the real values and its preview
-- was correct, while the homepage disagreed. That split is exactly why this
-- looked like a caching or revalidation problem for so long: every layer above
-- the database was working, and the data simply never arrived.
--
-- These values are public by definition: they are labels and numbers rendered
-- on the homepage for anonymous visitors. Nothing here is a secret.
--
-- `admin_emails` and `telegram_publish` deliberately stay out of the list —
-- the first is covered by its own self-scoped policy, and the second is
-- operational configuration with no business being readable by a visitor.

begin;

drop policy if exists select_site_settings_public on public.site_settings;

create policy select_site_settings_public
  on public.site_settings
  for select
  using (
    key = any (array[
      'homepage_hero',
      'homepage_sections',
      'homepage_stats',
      'maintenance_mode',
      'featured_listings_limit',
      'featured_roommates_limit'
    ])
  );

commit;

notify pgrst, 'reload schema';
