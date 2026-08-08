-- Split the free-text `role` into `university` and `city`.
--
-- `role` held whatever an admin typed — "Student at KazNU", "KBTU · Almaty",
-- "3rd year". The home page renders it verbatim under the name, so the format
-- of the most repeated line in the testimonial wall depended on whoever last
-- filled the box. Two columns make it structured data the form can label, and
-- leaves room to filter or group by university later.
--
-- `role` is KEPT, not dropped. Existing rows have their text there, the home
-- page still falls back to it when the new columns are empty, and dropping a
-- populated column to save two nullable text fields would be trading real data
-- for tidiness.

alter table public.testimonials
  add column if not exists university text not null default '',
  add column if not exists city text not null default '';

-- Backfill the common "X · Y" shape written by hand so far. Anything that does
-- not match is left alone and keeps rendering through the `role` fallback,
-- rather than being guessed at and split in the wrong place.
update public.testimonials
   set university = btrim(split_part(role, '·', 1)),
       city       = btrim(split_part(role, '·', 2))
 where role like '%·%'
   and university = ''
   and city = '';

notify pgrst, 'reload schema';
