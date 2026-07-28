/**
 * The stored `profiles.role` value that denotes an administrator.
 *
 * Defense-in-depth ONLY — this is a non-obvious literal instead of "admin" so
 * that a leaked/guessed self-write can't simply set role to the word "admin".
 * It is NOT the primary control: the authoritative protection is the
 * `guard_privileged_columns` trigger (supabase/migrations/20240101000700_privileged_column_guard.sql),
 * which prevents any non-service-role caller from writing `profiles.role` at all.
 * Never rely on the obscurity of this value for security.
 */
export const ADMIN_ROLE = "TimaEra";

/**
 * Admin allowlist bootstrap check. Administrator access is granted to any email
 * in ADMIN_EMAILS (comma-separated).
 *
 * FAIL-CLOSED: in production, if ADMIN_EMAILS is not set the env allowlist is
 * EMPTY. A misconfigured deploy must never silently grant admin to a hardcoded
 * address. The development default exists only for local convenience. Callers
 * (`requireAdminUser`, `middleware`) also honor a `profiles.role === ADMIN_ROLE`
 * flag and the admin-managed `site_settings.admin_emails` list as secondary
 * bootstrap paths, so real admins remain reachable after first setup.
 */
const DEV_DEFAULT_ADMIN_EMAILS = ["yeraly28.10@gmail.com"];

function getAllowlist(): string[] {
  const fromEnv = process.env.ADMIN_EMAILS;

  if (!fromEnv) {
    // Fail closed in production: no env allowlist => no env-granted admins.
    if (process.env.NODE_ENV === "production") return [];
    return DEV_DEFAULT_ADMIN_EMAILS.map((email) => email.trim().toLowerCase());
  }

  return fromEnv.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAllowlist().includes(email.trim().toLowerCase());
}
