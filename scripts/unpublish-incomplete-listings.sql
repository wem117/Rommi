-- Unpublish listings that are too incomplete to be worth showing.
--
-- Two scopes, because they have very different blast radii:
--
--   -v scope=university   (default) rows with no university tag.       44 rows
--   -v scope=all                    also rows with no photo.           85 rows
--
-- `university` is the one that fixes the reported filter bug: untagged listings
-- were what the university filter's old city fallback swept in, so removing
-- them from the feed is the data half of that fix. `all` additionally clears
-- photo-less listings, which is a much larger content decision — on this data
-- it leaves 35 of 120 live.
--
-- Price is NOT a criterion under either scope. The Telegram importer meets
-- genuine posts that never state one, and "Price not specified" is truthful for
-- those. The listing FORM now refuses all three, so this only ever has to deal
-- with rows written before that rule existed.
--
-- REVERSIBLE. Every row it touches records why in `unpublished_reason`, so the
-- whole operation undoes with:
--
--     update public.listings
--        set status = 'approved', unpublished_reason = null
--      where unpublished_reason is not null;
--
-- Re-runnable: rows already unpublished are skipped, and a listing that later
-- gains a photo and a university is NOT automatically republished — that is a
-- moderation decision, not a data one.
--
-- `pending`, not `draft`: the status column is constrained to
-- pending/approved/rejected, and "pending" is precisely what these rows are —
-- awaiting a change before they can be shown. It also puts them back in the
-- admin moderation queue rather than into a state nothing surfaces.
--
-- Usage:
--     psql ... -v apply=0 -f scripts/unpublish-incomplete-listings.sql   # dry run
--     psql ... -v apply=1 -f scripts/unpublish-incomplete-listings.sql   # commit

\set ON_ERROR_STOP on
\if :{?apply} \else \set apply 0 \endif
\if :{?scope} \else \set scope university \endif

alter table public.listings
  add column if not exists unpublished_reason text;

begin;

create temporary table _incomplete on commit drop as
select
  id,
  owner_id,
  left(title, 60) as title,
  nullif(
    concat_ws(
      ' + ',
      case when coalesce(array_length(photo_urls, 1), 0) = 0 then 'no_photos' end,
      case when coalesce(university, '') = ''                then 'no_university' end
    ),
    ''
  ) as reason
from public.listings
where status = 'approved'
  and not removed
  and (
    coalesce(university, '') = ''
    or (:'scope' = 'all' and coalesce(array_length(photo_urls, 1), 0) = 0)
  );

\echo ''
\echo '--- listings that fail the completeness rule ---'
\echo 'scope:' :scope
select reason, count(*) from _incomplete group by reason order by 2 desc;
select count(*) as total_affected from _incomplete;

\if :apply
  update public.listings l
     set status = 'pending',
         unpublished_reason = i.reason,
         updated_at = now()
    from _incomplete i
   where l.id = i.id;

  \echo '>>> APPLIED — rows moved to status=pending.'
  \echo '>>> Undo: update public.listings set status=''approved'', unpublished_reason=null where unpublished_reason is not null;'
  commit;
\else
  \echo '>>> DRY RUN — nothing changed. Re-run with -v apply=1 to commit.'
  rollback;
\endif

-- Owners of affected listings, so they can be prompted to finish them.
-- A view rather than a flag column on `profiles`: the answer is derived from
-- the listings themselves and would go stale the moment an owner fixed one.
create or replace view public.incomplete_listing_owners as
select
  l.owner_id,
  count(*) as incomplete_count,
  array_agg(l.id) as listing_ids
from public.listings l
where l.status = 'pending'
  and l.unpublished_reason is not null
group by l.owner_id;
