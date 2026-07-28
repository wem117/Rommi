-- Optional contact methods on profiles: Telegram username and phone number,
-- plus an admin moderation flag to hide inappropriate contacts from public view.
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent).

alter table public.profiles add column if not exists telegram text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists contacts_hidden boolean not null default false;
