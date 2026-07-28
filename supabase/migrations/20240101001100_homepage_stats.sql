-- Admin-configurable homepage "trust" statistics (base value + daily growth
-- range + start date per metric; the app derives today's number
-- deterministically). Run once in the Supabase SQL editor. Safe to re-run.

insert into public.site_settings (key, value) values
  ('homepage_stats', '{
    "startDate": "2025-01-01",
    "listings": {"base": 1250, "growthMin": 2, "growthMax": 5},
    "students": {"base": 4875, "growthMin": 5, "growthMax": 20},
    "matches": {"base": 2150, "growthMin": 1, "growthMax": 4}
  }')
on conflict (key) do nothing;

-- homepage_stats is non-sensitive and the home page needs it for anonymous
-- visitors, so widen the public read policy to include it.
drop policy if exists select_site_settings_public on public.site_settings;
create policy select_site_settings_public
  on public.site_settings
  for select
  using (
    key in (
      'homepage_hero', 'homepage_sections', 'homepage_stats', 'maintenance_mode',
      'featured_listings_limit', 'featured_roommates_limit'
    )
  );
