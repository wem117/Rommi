-- Atomic mutation RPCs (CONCURRENCY-CORRECTNESS fix).
--
-- The app previously performed read-modify-write on array/jsonb columns from the
-- browser (favorites, viewed/contacted history, conversation unread counts). Two
-- concurrent writes => lost updates and corrupted unread counters. These RPCs
-- move each mutation into a single atomic UPDATE (or upsert), eliminating the
-- race. All run SECURITY INVOKER, so Row Level Security and the privileged-column
-- guard still apply exactly as before — a caller can only mutate rows they own /
-- participate in.
--
-- Run once in the Supabase SQL editor. Idempotent.

-- 1. Favorites: add/remove a listing id on the caller's own profile ----------
create or replace function public.toggle_favorite_listing(p_listing_id text, p_active boolean)
returns void
language sql
security invoker
set search_path = public, pg_temp
as $$
  update public.profiles
     set favorite_listing_ids = case
           when p_active then array_remove(favorite_listing_ids, p_listing_id)
           when p_listing_id = any(favorite_listing_ids) then favorite_listing_ids
           else array_append(favorite_listing_ids, p_listing_id)
         end,
         updated_at = now()
   where uid = auth.uid()::text;
$$;

-- 2. Favorites: add/remove a roommate id -------------------------------------
create or replace function public.toggle_favorite_roommate(p_roommate_id text, p_active boolean)
returns void
language sql
security invoker
set search_path = public, pg_temp
as $$
  update public.profiles
     set favorite_roommate_ids = case
           when p_active then array_remove(favorite_roommate_ids, p_roommate_id)
           when p_roommate_id = any(favorite_roommate_ids) then favorite_roommate_ids
           else array_append(favorite_roommate_ids, p_roommate_id)
         end,
         updated_at = now()
   where uid = auth.uid()::text;
$$;

-- 3. Recently viewed / contacted: prepend, dedupe, cap at 24 -----------------
create or replace function public.record_recent_listing(p_column text, p_listing_id text)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if p_column not in ('viewed_listing_ids', 'contacted_listing_ids') then
    raise exception 'invalid column %', p_column;
  end if;

  if p_column = 'viewed_listing_ids' then
    update public.profiles
       set viewed_listing_ids =
             (array[p_listing_id] || array_remove(viewed_listing_ids, p_listing_id))[1:24],
           updated_at = now()
     where uid = auth.uid()::text;
  else
    update public.profiles
       set contacted_listing_ids =
             (array[p_listing_id] || array_remove(contacted_listing_ids, p_listing_id))[1:24],
           updated_at = now()
     where uid = auth.uid()::text;
  end if;
end;
$$;

-- 4. Conversation unread counters (atomic jsonb rebuild) ---------------------
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language sql
security invoker
set search_path = public, pg_temp
as $$
  update public.conversations
     set unread_counts = jsonb_set(coalesce(unread_counts, '{}'::jsonb), array[auth.uid()::text], '0'::jsonb, true),
         updated_at = now()
   where id = p_conversation_id
     and auth.uid()::text = any(participant_ids);
$$;

create or replace function public.bump_conversation_after_send(
  p_conversation_id uuid,
  p_last_message text
)
returns void
language sql
security invoker
set search_path = public, pg_temp
as $$
  update public.conversations
     set unread_counts = coalesce((
           select jsonb_object_agg(
                    key,
                    case when key = auth.uid()::text then to_jsonb(0)
                         else to_jsonb((value)::int + 1) end)
             from jsonb_each_text(coalesce(unread_counts, '{}'::jsonb))
         ), '{}'::jsonb),
         last_message = p_last_message,
         last_message_at = now(),
         updated_at = now()
   where id = p_conversation_id
     and auth.uid()::text = any(participant_ids);
$$;

-- 5. Get-or-create conversation (dedupe race fix) ----------------------------
-- Deterministic key over the sorted participant set + listing so two users
-- opening the same chat simultaneously converge on ONE row.
create or replace function public.conversation_dedupe_key(p_participant_ids text[], p_listing_id uuid)
returns text
language sql
immutable
as $$
  select array_to_string(array(select unnest(p_participant_ids) order by 1), ',')
         || '|' || coalesce(p_listing_id::text, '');
$$;

-- NOTE: if the table already contains duplicate conversations this index build
-- will fail; de-duplicate first (keep the oldest per key). For a pre-launch DB
-- there is typically nothing to clean.
create unique index if not exists conversations_dedupe_idx
  on public.conversations (public.conversation_dedupe_key(participant_ids, listing_id));

create or replace function public.get_or_create_conversation(
  p_participant_ids text[],
  p_listing_id uuid,
  p_listing_title text
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_key text := public.conversation_dedupe_key(p_participant_ids, p_listing_id);
begin
  if not (auth.uid()::text = any(p_participant_ids)) then
    raise exception 'forbidden: caller is not a participant';
  end if;

  select id into v_id
    from public.conversations
   where public.conversation_dedupe_key(participant_ids, listing_id) = v_key
   limit 1;
  if v_id is not null then
    return v_id;
  end if;

  insert into public.conversations (participant_ids, listing_id, listing_title, unread_counts)
  values (
    p_participant_ids,
    p_listing_id,
    p_listing_title,
    coalesce((select jsonb_object_agg(pid, to_jsonb(0)) from unnest(p_participant_ids) pid), '{}'::jsonb)
  )
  on conflict (public.conversation_dedupe_key(participant_ids, listing_id)) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id
      from public.conversations
     where public.conversation_dedupe_key(participant_ids, listing_id) = v_key
     limit 1;
  end if;

  return v_id;
end;
$$;

grant execute on function public.toggle_favorite_listing(text, boolean) to authenticated;
grant execute on function public.toggle_favorite_roommate(text, boolean) to authenticated;
grant execute on function public.record_recent_listing(text, text) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.bump_conversation_after_send(uuid, text) to authenticated;
grant execute on function public.get_or_create_conversation(text[], uuid, text) to authenticated;
