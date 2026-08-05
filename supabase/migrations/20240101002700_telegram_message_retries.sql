-- Durable retry state for Telegram messages whose AI extraction failed for a
-- reason that is not the message's fault.
--
-- Before this, telegram_listener marked EVERY message processed in a `finally:`
-- block — including one whose extraction died on a Gemini 429. The message text
-- survived in telegram_messages, but nothing would ever look at it again, so a
-- quota outage silently converted a batch of real listings into rows no human
-- would ever see. The service reported no error: from its point of view the
-- message had been handled.
--
-- `processed` stays the single "this message is finished" flag so existing
-- readers (and telegram_messages_processed_idx) keep working unchanged. The
-- columns below only describe HOW a still-unfinished message should be picked
-- back up.

alter table public.telegram_messages
  -- How many extraction attempts this message has already cost. Bounded retry:
  -- the worker gives up after a ceiling so a permanently poisonous message
  -- cannot occupy the queue forever.
  add column if not exists attempts integer not null default 0,
  -- When the message becomes eligible again. NULL means "eligible now", which
  -- is what every pre-existing unprocessed row correctly reads as.
  add column if not exists next_attempt_at timestamptz,
  -- Last failure reason, so the queue is diagnosable from SQL alone without
  -- correlating against container logs that may have rotated away.
  add column if not exists last_error text;

-- The sweeper's exact access path: unprocessed rows that are due, oldest first.
-- Partial on `processed = false` for the same reason
-- telegram_messages_processed_idx is — the finished rows are the overwhelming
-- majority and never appear in this query.
create index if not exists telegram_messages_retry_idx
  on public.telegram_messages (next_attempt_at nulls first, created_at)
  where processed = false;

-- Grants are declared centrally in 20240101002600_telegram_imports_grants.sql
-- and are table-level, so the new columns inherit them; RLS (enabled, zero
-- policies) is likewise unaffected. Nothing to re-grant here.
