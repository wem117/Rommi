-- Rename the admin role value (defense-in-depth, §1.2).
--
-- The application now recognizes the ADMIN_ROLE constant ("TimaEra") instead of
-- the literal "admin" as the administrator marker (see src/lib/auth/admin-access.ts).
-- This migrates any existing rows so current admins keep their access.
--
-- This is a non-obvious literal, NOT a security control on its own — the real
-- protection is the guard_privileged_columns trigger
-- (supabase-migration-privileged-column-guard.sql), which blocks non-service-role
-- writes to profiles.role entirely. Run this AFTER the guard-trigger migration.
-- Idempotent: a second run matches no rows.

update public.profiles set role = 'TimaEra' where role = 'admin';
