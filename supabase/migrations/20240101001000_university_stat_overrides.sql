-- Admin-controllable stat digits for the "Popular University Hubs" home cards.
-- Each hub card shows two numbers: listings and students. By default these are
-- computed live (real listing/roommate counts). These optional override columns
-- let an admin pin an exact number per university; NULL means "use the live
-- computed count" so existing behavior is unchanged until an override is set.
--
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent).

alter table public.universities add column if not exists listings_count_override int;
alter table public.universities add column if not exists students_count_override int;
