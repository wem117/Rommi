-- A rating on testimonials.
--
-- The home page already drew five stars on every testimonial, hardcoded, with
-- nothing behind them. That is a fabricated rating: it asserts a score the
-- platform never collected, on the section whose entire purpose is social
-- proof. Now it is a column an admin sets alongside the quote they are
-- publishing, so the stars report something real.
--
-- Defaults to 5 because an admin only publishes a testimonial they consider
-- positive; the point is that it is now editable and stored, not assumed.

alter table public.testimonials
  add column if not exists rating smallint not null default 5;

alter table public.testimonials drop constraint if exists testimonials_rating_check;
alter table public.testimonials
  add constraint testimonials_rating_check check (rating between 1 and 5);

notify pgrst, 'reload schema';
