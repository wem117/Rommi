-- Enable Supabase Realtime for chat (replaces client-side polling).
--
-- The app now subscribes to postgres_changes on messages + conversations instead
-- of polling every 4s/8s. Realtime only streams changes for tables that are
-- members of the `supabase_realtime` publication, and it enforces RLS on
-- delivery — so participants receive only their own conversations' events.
--
-- Run once in the Supabase SQL editor. Idempotent (skips tables already added).

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    execute 'alter publication supabase_realtime add table public.conversations';
  end if;
end $$;

-- Realtime evaluates RLS using the row image; REPLICA IDENTITY FULL ensures
-- UPDATE/DELETE events carry enough columns for the RLS participant check.
alter table public.messages replica identity full;
alter table public.conversations replica identity full;
