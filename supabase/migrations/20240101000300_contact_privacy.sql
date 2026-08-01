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

-- CRITICAL — why this is a table-level REVOKE followed by a column-level GRANT,
-- and NOT `revoke select (email, telegram, phone) ... from anon`:
--
-- Supabase bootstraps every project with `grant all on all tables in schema
-- public to anon, authenticated`. A column-level REVOKE does NOT subtract from
-- an existing TABLE-level grant — Postgres keeps the table-wide privilege, which
-- already covers every column, so the revoke silently succeeds and changes
-- nothing. This file previously used that form and was therefore a no-op: it was
-- applied to production yet `anon` could still read every user's email via
--   GET /rest/v1/profiles?select=email      (the anon key is public by design).
--
-- The working pattern is: drop the table-wide grant, then re-grant only the
-- columns anonymous visitors may see. Contacts (email/telegram/phone) and the
-- viewer-private behavioural arrays (favorites/viewed/contacted) are excluded.
-- `authenticated` is untouched and keeps full SELECT, which is what the
-- auth-gated detail pages rely on.
revoke select on public.profiles from anon;

grant select (
  uid, full_name, age, gender, university, occupation,
  min_budget, max_budget, preferred_move_in_date, lifestyle,
  onboarding_complete, looking_for_apartment, photo_url, bio,
  role, verified, banned, banned_at, verified_at, suspended, suspended_at,
  profile_completion, roommate_status, featured, featured_position,
  contacts_hidden, terms_accepted_at, terms_version,
  created_at, updated_at
) on public.profiles to anon;

-- Anonymous visitors never write profiles (RLS already denies it); removing the
-- inherited table-wide write grants makes that explicit at the privilege layer.
revoke insert, update, delete on public.profiles from anon;
