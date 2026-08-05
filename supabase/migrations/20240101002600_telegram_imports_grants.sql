-- Explicit privileges for the Telegram import tables.
--
-- CONTEXT: this is NOT the fix for the PGRST205 incident
--   The 404 PGRST205 ("Could not find the table 'public.telegram_sources' in
--   the schema cache") seen against https://api.roomi.kz had a simpler cause:
--   20240101002500 had never been applied to that database at all. It was
--   applied to a *different* Supabase instance. Verified side by side, same
--   anon key semantics, same moment:
--
--     table              api.roomi.kz (prod)   the other instance
--     listings           200                   200
--     telegram_sources   404 PGRST205          200 []
--     telegram_messages  404 PGRST205          200 []
--     telegram_listings  404 PGRST205          200 []
--
--   `listings` answering 200 on prod proves the schema cache there was healthy;
--   only these three tables were absent, because they did not exist. That also
--   explains why `NOTIFY pgrst, 'reload schema'` changed nothing — reloading
--   cannot surface a table the database does not have. The actual fix is
--   applying the migrations to the right database; see the "Self-hosted"
--   section of supabase/migrations/README.md and the migrate step in
--   .github/workflows/deploy-telegram-service.yml.
--
-- WHAT THIS MIGRATION IS FOR
--   Two hardening changes that stand on their own, independent of that
--   incident.
--
--   1. 20240101002500 granted nothing explicitly. It relied on Supabase's
--      ambient `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES TO ...
--      service_role` being in force on whatever database it landed on. Default
--      privileges are per-granting-role and per-schema, so that assumption
--      silently varies between a hosted project, a self-hosted stack, and a
--      `supabase db reset` — and when it does not hold, the service-role client
--      gets a permission error at runtime rather than at migration time.
--      Granting explicitly makes the worker's access a property of this
--      migration instead of a property of the environment.
--
--   2. These tables hold scraped listing text and extracted CONTACT DETAILS —
--      phone numbers, Telegram handles, WhatsApp numbers of real people.
--      20240101002500 protects them with RLS enabled and zero policies, which
--      does deny anon/authenticated outright (confirmed above: the instance
--      that has the tables returns `[]`, not rows). This adds the second,
--      independent layer — the grants themselves — so that a future migration
--      adding a well-meaning `create policy` cannot by itself expose contact
--      data. A role with no SELECT grant cannot read the table whatever the
--      policies say.
--
--   Net effect per role:
--     service_role   SELECT/INSERT/UPDATE/DELETE  (the telegram-service worker,
--                    and the Next.js admin routes via createSupabaseAdminClient())
--     anon           nothing
--     authenticated  nothing
--
--   Revoking from anon/authenticated while granting to service_role is the
--   ordinary Supabase posture for server-only tables; the service-role key both
--   holds these grants and carries BYPASSRLS, so the worker is unaffected.
--
--   Verification note: with SELECT revoked, an anon request to
--   /rest/v1/telegram_sources no longer returns 404 PGRST205. After this,
--   a 404 means "migrations not applied to this database" — an unambiguous
--   signal, which is exactly what was missing while diagnosing the incident.
--
-- Idempotent: GRANT/REVOKE are declarative, so re-running is a no-op.

begin;

-- 1) The only role permitted to touch these tables. TRUNCATE/TRIGGER/REFERENCES
--    are deliberately excluded: PostgREST only ever issues SELECT/INSERT/
--    UPDATE/DELETE, and TRUNCATE in particular is not restrained by RLS at all.
grant select, insert, update, delete
  on public.telegram_sources, public.telegram_messages, public.telegram_listings
  to service_role;

-- 2) `revoke all` rather than an enumerated list, so a privilege arriving from
--    some default-privileges rule we have not anticipated is stripped too.
revoke all
  on public.telegram_sources, public.telegram_messages, public.telegram_listings
  from anon, authenticated;

commit;

-- 3) Publish the change to PostgREST.
--
--    Outside the transaction on purpose: NOTIFY payloads are only delivered at
--    COMMIT, so sending it here makes the ordering explicit rather than relying
--    on the reader to know that. Supabase ships a DDL event trigger that fires
--    this automatically, but that trigger watches DDL and steps 1-2 are
--    GRANT/REVOKE. Sending it unconditionally is free. `pgrst` is PostgREST's
--    default db-channel.
notify pgrst, 'reload schema';
