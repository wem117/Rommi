-- Roommate-search drafts, the automatic-publish audit trail, admin-managed
-- Telegram sessions and channel priority — plus making a listing's price
-- genuinely optional.
--
-- Five independent groups; each stands on its own.
--
-- Idempotent throughout: the deploy workflow replays every telegram migration
-- on every deploy.

begin;

-- 1) ------------------------------------------- what KIND of record this is
--
-- A Telegram housing channel carries two different things, and until now the
-- service assumed everything was the first:
--
--   listing   a place on offer   -> a `listings` row with a host profile
--   roommate  a person looking   -> a profile in the /roommates directory
--
-- They share almost every keyword — both say "квартира", "подселение" and name
-- a budget — and only the verb separates them. Publishing the second as the
-- first puts a student's request up as somebody's rental, with their phone
-- number attached to a property they do not have. `draft_kind` is what the
-- approve route branches on, so the two can never be confused again.
alter table public.telegram_listings
  add column if not exists draft_kind text not null default 'unknown',
  -- 0-100, summed from what the parser actually established. Stored because an
  -- automatic publish has to remain explicable after the fact without
  -- re-running anything.
  add column if not exists confidence integer not null default 0,
  -- Set when the service published without a human. NULL means a person did it
  -- (or it is still waiting), which is the distinction an audit needs.
  add column if not exists auto_published_at timestamptz,
  -- Why a draft was held. Kept even after approval: "what stopped this going
  -- out automatically" is the question that tunes the thresholds.
  add column if not exists publish_blockers text[] not null default array[]::text[],
  -- Who the post is looking for, when it says so. NULL is "not stated", which
  -- is different from "anyone" — only a human may turn one into the other.
  add column if not exists gender_preference text,
  add column if not exists student_only boolean not null default false,
  -- How many people are SOUGHT, as distinct from how many the place holds.
  add column if not exists roommate_wanted integer,
  add column if not exists metro text not null default '';

alter table public.telegram_listings
  drop constraint if exists telegram_listings_draft_kind_check;
alter table public.telegram_listings
  add constraint telegram_listings_draft_kind_check
  check (draft_kind in ('listing', 'roommate', 'unknown'));

alter table public.telegram_listings
  drop constraint if exists telegram_listings_gender_preference_check;
alter table public.telegram_listings
  add constraint telegram_listings_gender_preference_check
  check (gender_preference is null or gender_preference in ('any', 'male', 'female'));

-- Roommate drafts approve into a profile, not a listing, so the audit trail
-- needs somewhere to record which profile.
alter table public.telegram_listings
  add column if not exists profile_uid uuid;

-- Backfill from what the previous parser already recorded, so existing drafts
-- route correctly rather than all landing in 'unknown'.
update public.telegram_listings
   set draft_kind = case
                      when listing_kind = 'seeking' then 'roommate'
                      when listing_kind in ('offer', 'shared') then 'listing'
                      else 'unknown'
                    end
 where draft_kind = 'unknown';

-- The review queue is worked kind by kind: a moderator checking roommate
-- profiles is not also checking rentals.
create index if not exists telegram_listings_kind_status_idx
  on public.telegram_listings (draft_kind, status, created_at desc);

-- 2) ------------------------------------------------------ channel priority
--
-- Which channels are read first when a backlog is being drained. Admin-managed
-- alongside enable/disable, so changing what the worker watches — or the order
-- it prefers — never needs a deploy.
alter table public.telegram_sources
  add column if not exists priority integer not null default 100,
  -- Operator notes: why this channel is here, who owns it.
  add column if not exists notes text not null default '';

create index if not exists telegram_sources_priority_idx
  on public.telegram_sources (priority asc, created_at asc) where enabled;

-- 3) -------------------------------------------------- Telegram credentials
--
-- The session was a file on a Docker volume, installed by hand over SSH. That
-- makes the single most operationally important credential in the service
-- invisible from the admin panel: nobody could see whether it was authorised,
-- when it last spoke to Telegram, or which account it belonged to — and
-- replacing it meant a shell.
--
-- Telethon can serialise a session to a STRING, so it can live here instead:
-- readable by the worker, replaceable from the admin panel, and visible in the
-- one place an operator already looks.
--
-- SECURITY. This table holds a credential granting full access to a Telegram
-- account. It gets the same posture as the rest of the Telegram tables — RLS
-- enabled, zero policies, privileges to service_role only — and one further
-- restriction: `session_string` is never returned to the browser. The admin API
-- selects the metadata columns explicitly and the UI renders status, never the
-- secret. Uploading is one-way.
create table if not exists public.telegram_sessions (
  id uuid primary key default gen_random_uuid(),
  -- Human label, e.g. "roomi-import-account". Not the phone number: that is
  -- personal data with no operational use once the session exists.
  label text not null default 'default',
  -- Telethon StringSession. Write-only from the UI's point of view.
  session_string text not null,
  -- Exactly one session is used by the worker at a time.
  is_active boolean not null default false,
  -- Reported by the worker, not by whoever uploaded the file.
  status text not null default 'unknown'
    check (status in ('unknown', 'connected', 'unauthorized', 'error', 'disconnected')),
  status_detail text not null default '',
  -- The liveness signal an operator actually needs: not "is the container up"
  -- but "when did this credential last succeed at talking to Telegram".
  last_heartbeat_at timestamptz,
  authorized_at timestamptz,
  -- Which Telegram account this turned out to be, filled in by the worker once
  -- it connects. Confirms the right account was uploaded.
  account_username text not null default '',
  account_display_name text not null default '',
  account_telegram_id bigint,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one active session. A partial unique index rather than a constraint,
-- because "only one row where is_active" is exactly what it expresses.
create unique index if not exists telegram_sessions_single_active_idx
  on public.telegram_sessions (is_active) where is_active;

alter table public.telegram_sessions enable row level security;

grant select, insert, update, delete on public.telegram_sessions to service_role;
revoke all on public.telegram_sessions from anon, authenticated;

drop trigger if exists telegram_sessions_set_updated_at on public.telegram_sessions;
create trigger telegram_sessions_set_updated_at
  before update on public.telegram_sessions
  for each row execute function public.set_telegram_updated_at();

-- 4) ------------------------------------------------------- optional price
--
-- A price the parser could not find must stay ABSENT. Storing 0 renders as
-- "0 ₸", which is not a free flat — it is a wrong number that a student then
-- budgets around, and it is indistinguishable from a genuine zero.
--
-- The column default stays 0 so nothing that writes without a price changes
-- behaviour; what changes is that NULL is now permitted and means "not stated".
alter table public.listings
  alter column monthly_rent drop not null;

alter table public.telegram_listings
  alter column price drop not null;

-- Existing Telegram drafts that recorded 0 meant "no price found" — the column
-- was NOT NULL, so the parser had nowhere else to put it. Now they can say so.
update public.telegram_listings set price = null where price = 0;

commit;

notify pgrst, 'reload schema';
