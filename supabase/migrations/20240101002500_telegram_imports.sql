-- Telegram -> AI -> Roomi listing automation.
--
-- Three tables, each owned exclusively by the service-role client:
--   telegram_sources   configured channels/groups to monitor (admin-managed)
--   telegram_messages  raw ingested messages, deduplicated by
--                       (source, telegram_message_id)
--   telegram_listings  AI-extracted draft listings awaiting admin review in
--                       Admin Panel -> Telegram Imports
--
-- None of these are exposed to `anon` or `authenticated` via PostgREST: RLS is
-- enabled with ZERO policies on all three, so every row is invisible to every
-- role except one with BYPASSRLS (the service-role client / a direct
-- superuser connection) — the same posture as `site_settings`'s admin-only
-- keys. Both the Python telegram-service (service-role key) and the Next.js
-- admin API routes (requireAdminUser() -> createSupabaseAdminClient()) are the
-- only intended callers. This is deliberate: Telegram message content and
-- extracted contact details must never leak to a public/anon read.
--
-- Approving a `telegram_listings` row does NOT insert into this table's own
-- columns and call it done — it maps the reviewed fields onto the existing
-- `adminQuickListingSchema` shape and calls the SAME createListing() /
-- createTemporaryHost() functions the admin's manual paste-and-publish flow
-- already uses (src/lib/data/listings-admin.ts, src/lib/data/seeded-hosts.ts),
-- so a Telegram-sourced listing is byte-for-byte indistinguishable from a
-- hand-seeded one once published. `listing_id` below records the result.

create table if not exists public.telegram_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- "@some_group" or a numeric chat id as text — whatever Telethon's
  -- get_entity() accepts. Unique so the same source can't be added twice.
  telegram_username text not null unique,
  type text not null default 'group' check (type in ('channel', 'group')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists telegram_sources_enabled_idx on public.telegram_sources(enabled);

create table if not exists public.telegram_messages (
  id uuid primary key default gen_random_uuid(),
  telegram_source_id uuid not null references public.telegram_sources(id) on delete cascade,
  -- Telegram message ids are per-chat sequential integers, not globally
  -- unique — the dedup key is the PAIR, not this column alone.
  telegram_message_id bigint not null,
  content text not null default '',
  processed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (telegram_source_id, telegram_message_id)
);

create index if not exists telegram_messages_processed_idx
  on public.telegram_messages(processed) where processed = false;

create table if not exists public.telegram_listings (
  id uuid primary key default gen_random_uuid(),
  telegram_message_id uuid references public.telegram_messages(id) on delete set null,

  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'published', 'rejected')),

  -- Extracted fields, named to match the AI extraction contract exactly (see
  -- telegram-service/app/extraction.py). Deliberately NOT the listings table's
  -- shape — this is a staging area for raw, possibly-incomplete/incorrect
  -- output the admin reviews before anything touches a real listing.
  title text not null default '',
  description text not null default '',
  city text not null default '',
  district text not null default '',
  address text not null default '',
  price integer not null default 0,
  currency text not null default 'KZT',
  rooms integer,
  property_type text,
  area numeric,
  floor integer,
  total_floors integer,
  amenities text[] not null default array[]::text[],
  contact_phone text not null default '',
  contact_telegram text not null default '',
  contact_whatsapp text not null default '',
  photo_urls text[] not null default array[]::text[],

  -- Full raw AI response, kept for audit/debugging regardless of whether it
  -- validated. NULL when extraction never ran (e.g. a message with no usable
  -- text).
  raw_ai_output jsonb,
  -- Populated when AI extraction or validation failed, so a broken row is
  -- still visible in the review queue with a reason instead of silently
  -- vanishing.
  extraction_error text,

  reviewed_by text,
  reviewed_at timestamptz,
  -- Set once Approve creates a real listing. ON DELETE SET NULL: deleting the
  -- published listing later must not cascade back and destroy the import
  -- history/audit trail.
  listing_id uuid references public.listings(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists telegram_listings_status_idx on public.telegram_listings(status);
create index if not exists telegram_listings_created_at_idx on public.telegram_listings(created_at desc);

alter table public.telegram_sources enable row level security;
alter table public.telegram_messages enable row level security;
alter table public.telegram_listings enable row level security;

-- Inherit the least-privilege defaults already applied to every other table in
-- this schema (20240101002000_least_privilege_grants.sql revoked
-- INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES from anon and
-- TRUNCATE/TRIGGER/REFERENCES from authenticated at the DEFAULT PRIVILEGES
-- level for tables `postgres` creates — which these are). No policies are
-- added for either role: RLS with zero policies denies all access outright,
-- which is the correct posture for tables that must never be readable by a
-- signed-in user, let alone anon.
revoke insert, update, delete, truncate, trigger, references
  on public.telegram_sources, public.telegram_messages, public.telegram_listings
  from anon;
revoke truncate, trigger, references
  on public.telegram_sources, public.telegram_messages, public.telegram_listings
  from authenticated;

-- updated_at maintenance, matching the pattern other admin tables use.
create or replace function public.set_telegram_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists telegram_sources_set_updated_at on public.telegram_sources;
create trigger telegram_sources_set_updated_at
  before update on public.telegram_sources
  for each row execute function public.set_telegram_updated_at();

drop trigger if exists telegram_listings_set_updated_at on public.telegram_listings;
create trigger telegram_listings_set_updated_at
  before update on public.telegram_listings
  for each row execute function public.set_telegram_updated_at();
