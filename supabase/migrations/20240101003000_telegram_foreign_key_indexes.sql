-- Indexes for the foreign keys the import pipeline actually queries.
--
-- `listing_exists_for_message()` runs on EVERY imported message and again on
-- every retry, and it filters `telegram_listings` by `telegram_message_id` —
-- a foreign key with no index behind it. At 35 draft rows the planner correctly
-- chose a sequential scan and nobody noticed; the queue is designed to hold
-- hundreds, and this is the guard that stops a message producing a second
-- draft, so it is exactly the query that must not degrade as the table grows.
--
-- `listing_id` is indexed for a different reason: it is ON DELETE SET NULL, so
-- deleting a published listing scans this table to clear the reference.
--
-- Both are cheap (a few kB at current volume) and both are on the write path of
-- a worker that runs unattended.

create index if not exists telegram_listings_message_idx
  on public.telegram_listings (telegram_message_id)
  where telegram_message_id is not null;

create index if not exists telegram_listings_listing_idx
  on public.telegram_listings (listing_id)
  where listing_id is not null;

-- Saved searches are read per user on every visit to the saved-search UI.
create index if not exists saved_searches_user_idx
  on public.saved_searches (user_id);
