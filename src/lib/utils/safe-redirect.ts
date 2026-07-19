/**
 * Returns a safe same-origin redirect path, or `/rooms` as a fallback.
 *
 * Prevents open-redirect: a `?redirect=` value must be a single-slash absolute
 * path ("/inbox"). Protocol-relative ("//evil.com") and absolute URLs
 * ("https://evil.com") are rejected so `router.replace()` can never navigate
 * the user off-site after login.
 */
export function safeRedirect(value: string | null | undefined, fallback = "/rooms"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
