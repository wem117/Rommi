-- Testimonials shown on the home page. Managed from the admin panel.
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default '',
  quote text not null,
  image_url text,
  badge text not null default '',
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists testimonials_active_position_idx on public.testimonials(active, position);
