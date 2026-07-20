/**
 * Where to send a user immediately after they're confirmed authenticated —
 * shared by the sign-in/sign-up pages (client-side, once `useAuth()` resolves)
 * and the middleware (server-side, so an already-authenticated visitor never
 * even sees the login form — see src/middleware.ts).
 *
 * Incomplete onboarding always wins (finish setup first). Otherwise honor the
 * `?redirect=` target, unless it points back at an auth-only page
 * (sign-in/sign-up/onboarding), which would just loop.
 */
export function resolvePostAuthDestination(onboardingComplete: boolean, redirectTo: string): string {
  if (!onboardingComplete) return "/onboarding/step-1";

  return redirectTo.startsWith("/sign-in") || redirectTo.startsWith("/sign-up") || redirectTo.startsWith("/onboarding")
    ? "/rooms"
    : redirectTo;
}
