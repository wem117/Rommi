# Database migrations

These are the Supabase CLI migrations for Roomi. They apply in filename
(timestamp) order and each is idempotent (safe to re-run).

## Applying

```bash
# Link once (project ref from the Supabase dashboard URL):
supabase link --project-ref <your-project-ref>

# Apply everything to the linked remote database:
supabase db push

# Or reset a LOCAL dev database and replay all migrations:
supabase db reset
```

## Order & provenance

The files were consolidated from the previously hand-run SQL scripts into a
single ordered history. The order reflects real dependencies:

| # | File | Purpose |
|---|------|---------|
| 00 | `..._schema.sql` | Base tables (profiles, listings, images, conversations, messages, reports, testimonials) |
| 01 | `..._admin_cms.sql` | `site_settings`, `property_categories`, `universities` tables |
| 02 | `..._contacts.sql` | Profile contact columns (telegram, phone) |
| 03 | `..._contact_privacy.sql` | Revoke contact columns from `anon` |
| 04 | `..._privilege_columns.sql` | Revoke trust/moderation columns from `anon`/`authenticated` |
| 05 | `..._policies.sql` | Row Level Security policies |
| 06 | `..._phase2.sql` | Public-read policies, archive/category columns, seed universities & categories |
| 07 | `..._privileged_column_guard.sql` | `guard_privileged_columns` BEFORE UPDATE trigger |
| 08 | `..._universities.sql` | University directory helpers |
| 09 | `..._university_search_map.sql` | University search/map columns |
| 10 | `..._university_stat_overrides.sql` | University stat overrides |
| 11 | `..._homepage_stats.sql` | Homepage stats settings |
| 12 | `..._rename_admin_role.sql` | Admin role rename |
| 13 | `..._browse_indexes.sql` | Indexes for the hot browse paths |
| 14 | `..._atomic_mutations.sql` | Atomic RPCs (favorites, unread, get-or-create conversation) |
| 15 | `..._search_index.sql` | pg_trgm search indexes + JSONB preference indexes |
| 16 | `..._realtime.sql` | Add messages + conversations to the realtime publication |

If your database was provisioned from the older standalone scripts, these are the
same statements — re-running is safe because every file is idempotent.
