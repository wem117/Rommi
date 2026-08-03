-- Address becomes optional; the map pin is the location.
--
-- `listings.address` was NOT NULL with no default, so every insert had to supply
-- something even when the source post never stated a street. The location now
-- comes from coordinates chosen on a map, and the address is free text that may
-- legitimately be empty.
--
-- SAFE FOR EXISTING ROWS. Dropping NOT NULL only widens what is accepted —
-- every current value stays exactly as it is, and nothing that reads the column
-- has to change (readers already coalesce). Coordinates are untouched.
--
-- Deliberately does NOT backfill or normalise existing addresses. Rewriting text
-- an admin or landlord typed is not this migration's business.
--
-- Idempotent.

alter table public.listings alter column address drop not null;

comment on column public.listings.address is
  'Optional free-text address (street, house, ЖК, landmark). Never geocoded; stored exactly as entered. The authoritative location is lat/lng.';
