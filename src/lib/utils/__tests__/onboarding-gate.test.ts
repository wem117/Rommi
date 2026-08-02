import { describe, expect, it } from "vitest";

import { canEnterProtectedPage, needsOnboarding } from "@/lib/utils/onboarding-gate";

const COMPLETED = { onboardingComplete: true };
const INCOMPLETE = { onboardingComplete: false };

describe("needsOnboarding", () => {
  it("sends a genuinely incomplete user to onboarding", () => {
    expect(needsOnboarding("ready", INCOMPLETE)).toBe(true);
  });

  it("sends a user with no profile row at all to onboarding", () => {
    // The read SUCCEEDED and found nothing: this really is a new account.
    expect(needsOnboarding("ready", null)).toBe(true);
  });

  it("never sends a completed user to onboarding", () => {
    expect(needsOnboarding("ready", COMPLETED)).toBe(false);
  });

  it("does not decide while the profile is still loading", () => {
    // The reported bug: `!profile?.onboardingComplete` was true here, so a
    // completed user was redirected mid-flight.
    expect(needsOnboarding("loading", null)).toBe(false);
    expect(needsOnboarding("loading", COMPLETED)).toBe(false);
  });

  it("does not decide when the profile read failed", () => {
    // A network hiccup is not evidence about anyone's onboarding state.
    expect(needsOnboarding("error", null)).toBe(false);
    expect(needsOnboarding("error", COMPLETED)).toBe(false);
  });
});

describe("canEnterProtectedPage", () => {
  it("lets a completed user in", () => {
    expect(canEnterProtectedPage("ready", COMPLETED)).toBe(true);
  });

  it("holds the spinner while the profile loads", () => {
    expect(canEnterProtectedPage("loading", COMPLETED)).toBe(false);
  });

  it("keeps an incomplete user out, so the redirect can run", () => {
    expect(canEnterProtectedPage("ready", INCOMPLETE)).toBe(false);
    expect(canEnterProtectedPage("ready", null)).toBe(false);
  });

  it("renders rather than spinning forever when the read failed", () => {
    // Degraded view, not an open door: the page's own data is fetched with the
    // user's session and authorized server-side regardless.
    expect(canEnterProtectedPage("error", null)).toBe(true);
  });
});
