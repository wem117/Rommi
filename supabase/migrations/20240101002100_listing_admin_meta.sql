-- Admin-only metadata for seeded listings.
--
-- While the marketplace is young the operator sources listings by hand from
-- Telegram, WhatsApp and university chats. Those listings need details a normal
-- listing does not carry: how to reach the actual landlord (who has no account),
-- where the listing came from, and private working notes.
--
-- WHY A SEPARATE TABLE RATHER THAN COLUMNS ON `listings`
-- ------------------------------------------------------
-- The public browse query issues `select("*")` on `listings`. Postgres rejects
-- `SELECT *` outright when the role lacks SELECT on any column, so adding
-- admin-only columns and revoking them would break browsing for every user —
-- the column-grant approach used for `profiles` works there only because those
-- queries name their columns explicitly.
--
-- A separate table sidesteps that entirely: `listings` keeps its shape, and this
-- data is unreachable for non-admins by row-level security rather than by the
-- application remembering not to select it. A regular user querying this table
-- gets zero rows, so nothing here can leak into a listing page by accident.
create table if not exists public.listing_admin_meta (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  -- Contact details for the real landlord, who typically has no Roomi account.
  contact_name text not null default '',
  contact_phone text not null default '',
  contact_telegram text not null default '',
  -- Where the listing was found, e.g. a Telegram post URL. Also the key used to
  -- spot a duplicate before it is entered twice.
  source_url text not null default '',
  source_note text not null default '',
  -- Private working notes. Never rendered outside the admin panel.
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.listing_admin_meta is
  'Admin-only metadata for hand-seeded listings. RLS restricts all access to admins; regular users see zero rows.';

create index if not exists listing_admin_meta_source_idx
  on public.listing_admin_meta (source_url)
  where source_url <> '';

alter table public.listing_admin_meta enable row level security;

-- Admin identification mirrors the existing convention: the `admin` role on the
-- caller's profile, or membership of the `admin_emails` site setting.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.uid::text = auth.uid()::text and p.role = 'admin'
  ) or exists (
    select 1 from public.site_settings s
    where s.key = 'admin_emails'
      and s.value ? lower(coalesce((auth.jwt() ->> 'email'), ''))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists listing_admin_meta_admin_all on public.listing_admin_meta;
create policy listing_admin_meta_admin_all
  on public.listing_admin_meta
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- No grants to anon at all: signed-out visitors cannot reach this table even
-- before RLS is consulted.
revoke all on public.listing_admin_meta from anon;
grant select, insert, update, delete on public.listing_admin_meta to authenticated;
