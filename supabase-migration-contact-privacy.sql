-- Contact privacy hardening.
-- The Phase 2 policy made profile rows publicly readable so anonymous visitors
-- can browse roommates, but row-level security cannot hide individual columns:
-- email, telegram, and phone were selectable by the anon role via PostgREST.
-- Column-level privileges close that hole at the database — signed-in users
-- (role `authenticated`) keep full access, matching the app's auth-gated
-- detail pages where contacts are shown.
--
-- NOTE: after this runs, anonymous queries must not use `select *` on
-- public.profiles (PostgREST rejects it when the role lacks access to any
-- column). The app's public browse queries request explicit safe columns.
--
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent).

-- Ensure the contact columns exist first (same statements as
-- supabase-migration-contacts.sql) so this file runs standalone on a
-- database where that migration hasn't been applied yet.
alter table public.profiles add column if not exists telegram text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists contacts_hidden boolean not null default false;

revoke select (email, telegram, phone) on public.profiles from anon;
