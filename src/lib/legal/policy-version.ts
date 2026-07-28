/**
 * Version of the published Terms of Service / Privacy Policy that users accept
 * at registration. Bump this whenever either document changes materially so
 * acceptance records stay attributable to the exact text that was agreed to.
 *
 * Date-based (ISO) to match the "Last updated" line shown on /terms and
 * /privacy. This value is written server-side only — never taken from the
 * client — see POST /api/auth/accept-terms.
 */
export const CURRENT_POLICY_VERSION = "2026-07-29";
