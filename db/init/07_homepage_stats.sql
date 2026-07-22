-- Portable subset of ../../supabase-migration-homepage-stats.sql (no RLS).
insert into public.site_settings (key, value) values
  ('homepage_stats', '{
    "startDate": "2025-01-01",
    "listings": {"base": 1250, "growthMin": 2, "growthMax": 5},
    "students": {"base": 4875, "growthMin": 5, "growthMax": 20},
    "matches": {"base": 2150, "growthMin": 1, "growthMax": 4}
  }')
on conflict (key) do nothing;
