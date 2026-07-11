/**
 * Admin allowlist. Administrator access is granted to any email in
 * ADMIN_EMAILS (comma-separated). Defaults to the project owner so the panel is
 * locked down out of the box. A `profiles.role === "admin"` flag is still
 * honored as a secondary path by callers.
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
