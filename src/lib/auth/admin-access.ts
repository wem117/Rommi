/**
 * The stored `profiles.role` value that denotes an administrator.
 *
 * Defense-in-depth ONLY — this is a non-obvious literal instead of "admin" so
 * that a leaked/guessed self-write can't simply set role to the word "admin".
 * It is NOT the primary control: the authoritative protection is the
 * `guard_privileged_columns` trigger (supabase-migration-privileged-column-guard.sql),
 * which prevents any non-service-role caller from writing `profiles.role` at all.
 * Never rely on the obscurity of this value for security.
 */
export const ADMIN_ROLE = "TimaEra";

/**
 * Admin allowlist bootstrap check. Administrator access is granted to any
 * email in ADMIN_EMAILS (comma-separated). Defaults to the project owner so
 * the panel is locked down out of the box. Callers (`requireAdminUser`,
 * `middleware`) also honor a `profiles.role === ADMIN_ROLE` flag and the
 * admin-managed `site_settings.admin_emails` list as secondary paths.
 */
const DEFAULT_ADMIN_EMAILS = ["yeraly28.10@gmail.com"];

function getAllowlist(): string[] {
  const fromEnv = process.env.ADMIN_EMAILS;
  const list = fromEnv ? fromEnv.split(",") : DEFAULT_ADMIN_EMAILS;
  return list.map((email) => email.trim().toLowerCase()).filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAllowlist().includes(email.trim().toLowerCase());
}
