-- Schema for the deterministic Telegram parser.
--
-- Three groups of changes, each independent of the others:
--
--   1. telegram_listings.lat/lng — a BUG FIX, not a feature. The approve route
--      (src/app/api/admin/telegram-imports/[id]/approve/route.ts) has always
--      written these two columns via updateTelegramImport() before publishing,
--      and they have never existed. Approving any Telegram import therefore
--      failed with a PostgREST "column not found" the moment an admin clicked
--      it. It went unnoticed only because the AI extractor's quota outage meant
--      no draft ever reached the queue to be approved.
--
--   2. The fields the deterministic parser extracts and the AI one did not:
--      ЖК/complex, capacity, deposit, utilities, and the intent of the post
--      (offering vs seeking). These are what turn a draft into something an
--      admin can approve without opening Telegram to check.
--
--   3. Sender and message provenance on telegram_messages. The spec requires
--      the poster's username, display name, first/last name and Telegram id to
--      be stored exactly as Telegram reports them, alongside the original text,
--      the message's own timestamp and the album it belonged to. None of that
--      was captured before, so a draft could not be traced back to a person.
--
-- The RLS posture is unchanged and deliberately so: RLS enabled, zero policies,
-- privileges granted to service_role only (20240101002600). These columns hold
-- CONTACT DETAILS of real people — phone numbers, handles, names — and must
-- remain invisible to anon and authenticated alike. Column-level grants inherit
-- from the table-level ones already in force, so nothing needs re-granting.
--
-- Idempotent throughout (add column if not exists / create index if not
-- exists), because the deploy workflow replays every telegram migration on
-- every deploy.

begin;

-- 1) ------------------------------------------------------------- lat / lng
--
-- Mirrors listings.lat/lng: the pin an admin drops in the review form, carried
-- on the draft so re-opening it shows where the last reviewer put it. Approval
-- still requires a pin (telegramImportApproveSchema), exactly as the manual
-- quick-create flow does.
alter table public.telegram_listings
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- 2) --------------------------------------------------- parsed listing fields
alter table public.telegram_listings
  -- The residential complex. In Kazakhstan this, not the street, is the address
  -- people navigate by, and it is what a student searches for.
  add column if not exists zhk text not null default '',
  -- Nearest university, matched against the app's own university names so the
  -- approve route can pass it straight through.
  add column if not exists university text not null default '',
  -- How many people the place is offered to ("до 5 человек", "жить втроем").
  add column if not exists capacity integer,
  add column if not exists deposit_amount integer,
  -- NULL means the post did not say — which is different from "no deposit",
  -- and an admin needs to be able to tell those apart before publishing.
  add column if not exists deposit_required boolean,
  add column if not exists deposit_note text not null default '',
  add column if not exists utilities_included boolean,
  add column if not exists utilities_note text not null default '',
  -- offer | shared | seeking | unknown. `seeking` is the one that matters:
  -- "ищу квартиру" is a person LOOKING for a room, and publishing it as
  -- inventory would put a student's request up as somebody's rental.
  add column if not exists listing_kind text not null default 'unknown',
  -- The contact exactly as written, kept beside the normalized +7XXXXXXXXXX
  -- form. When a number turns out to be wrong, the raw value is the evidence.
  add column if not exists contact_phone_raw text not null default '',
  add column if not exists contact_whatsapp_raw text not null default '',
  -- Which ruleset produced this draft, so a field that looks wrong can be
  -- traced to the version that extracted it rather than guessed at.
  add column if not exists parser_version text not null default '',
  add column if not exists parser_output jsonb;

-- The AI is gone; so is the column named after it. Renamed rather than dropped
-- so any historical row keeps its audit trail — though in practice there are
-- none, because the quota outage meant no draft was ever created. Guarded so a
-- replay after the rename is a no-op.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'telegram_listings'
      and column_name = 'raw_ai_output'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'telegram_listings'
      and column_name = 'parser_output'
  ) then
    alter table public.telegram_listings rename column raw_ai_output to parser_output;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'telegram_listings'
      and column_name = 'raw_ai_output'
  ) then
    -- Both exist (the ADD above won the race on a fresh database): fold the old
    -- one in and drop it, so exactly one column holds extraction output.
    update public.telegram_listings
      set parser_output = raw_ai_output
      where parser_output is null and raw_ai_output is not null;
    alter table public.telegram_listings drop column raw_ai_output;
  end if;
end
$$;

alter table public.telegram_listings
  drop constraint if exists telegram_listings_listing_kind_check;
alter table public.telegram_listings
  add constraint telegram_listings_listing_kind_check
  check (listing_kind in ('offer', 'shared', 'seeking', 'unknown'));

-- 3) ------------------------------------------------- sender and provenance
alter table public.telegram_messages
  -- Telegram's own numeric id for the poster. Stable across username changes,
  -- which is exactly why it is stored separately from the handle.
  add column if not exists sender_telegram_id bigint,
  add column if not exists sender_username text not null default '',
  add column if not exists sender_first_name text not null default '',
  add column if not exists sender_last_name text not null default '',
  -- Not derived from first+last: for a channel post this is the channel title,
  -- and for a user it is what Telegram itself displays. Assembling it here
  -- would lose that distinction.
  add column if not exists sender_display_name text not null default '',
  add column if not exists sender_is_bot boolean not null default false,
  -- When Telegram says the message was sent, as opposed to when this worker
  -- happened to receive it (created_at). They differ after any downtime.
  add column if not exists message_date timestamptz,
  -- Telegram's album id. Every member of a multi-photo post shares it; only
  -- one member carries the caption, which is why the worker reassembles them
  -- before parsing (app/albums.py).
  add column if not exists grouped_id bigint,
  -- The ids of every photo-bearing message in that album, so a retry can
  -- re-fetch the whole post's images rather than just the captioned one.
  add column if not exists photo_message_ids bigint[] not null default array[]::bigint[];

-- 4) ---------------------------------------------------- per-source defaults
--
-- A channel called "SDU Housing" posts about Kaskelen/Almaty, and says so in
-- maybe a third of its messages — the rest just say "5 минут от университета".
-- The parser cannot invent a city it was not told, and refusing to guess is the
-- right behaviour for the TEXT; but the SOURCE knows, and an admin configured
-- it. Used strictly as a fallback: a city named in the post always wins, and
-- the draft records a warning saying the fallback was applied.
alter table public.telegram_sources
  add column if not exists default_city text not null default '';

-- The four sources that exist in production today. Written as an UPDATE guarded
-- on the current value so re-running never overrides an admin's later edit.
update public.telegram_sources
   set default_city = 'Almaty'
 where default_city = ''
   and telegram_username in ('SDU_housing', 'kbtuhousing', 'Narxoz_housings');

update public.telegram_sources
   set default_city = 'Astana'
 where default_city = ''
   and telegram_username in ('astana_krysha');

-- The review queue's own access path: newest pending drafts first. The existing
-- telegram_listings_status_idx covers the equality alone; this covers the sort
-- that always accompanies it, so the queue never sorts a heap.
create index if not exists telegram_listings_pending_idx
  on public.telegram_listings (created_at desc)
  where status in ('draft', 'pending_review');

commit;

notify pgrst, 'reload schema';
