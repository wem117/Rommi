import type { ProfileStatus } from "@/context/auth-context";

/**
 * The single rule for "should this user be sent into onboarding?".
 *
 * ROOT CAUSE THIS ENCODES
 * -----------------------
 * The guards each wrote their own version of `!profile?.onboardingComplete`.
 * That expression is true in three completely different situations:
 *
 *   1. the profile row says onboarding is not finished   → onboarding IS needed
 *   2. the user has no profile row yet                   → onboarding IS needed
 *   3. the profile has not loaded, or failed to load     → UNKNOWN
 *
 * Case 3 is the bug. A completed user whose profile fetch was still in flight,
 * or had failed once, was treated as case 1 and redirected to
 * /onboarding/step-1 — and the onboarding layout then declined to send them
 * back out (its own check also saw no profile), so they were stuck there.
 * Finishing onboarding without refreshing the cached profile produced the same
 * state, which is why it showed up right after signup.
 *
 * A user is sent to onboarding only on positive evidence: the read succeeded,
 * and it says onboarding is unfinished. Anything else waits.
 */
export function needsOnboarding(
  status: ProfileStatus,
  profile: { onboardingComplete?: boolean } | null
): boolean {
  if (status !== "ready") return false;
  return !profile?.onboardingComplete;
}

/**
 * True once we know enough to render a protected page.
 *
 * On `error` we let the page render rather than spinning forever: the data it
 * shows is fetched with the user's own session and separately authorized
 * server-side, so a failed profile read is a degraded view, not an open door.
 */
export function canEnterProtectedPage(
  status: ProfileStatus,
  profile: { onboardingComplete?: boolean } | null
): boolean {
  if (status === "loading") return false;
  if (status === "error") return true;
  return Boolean(profile?.onboardingComplete);
}
