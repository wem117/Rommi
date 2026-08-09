import { describe, expect, it } from "vitest";

import { escapeLikePattern } from "@/app/api/auth/email-status/route";

/**
 * /api/auth/email-status reports whether an address is registered, which the
 * sign-in UX needs and which makes it an enumeration oracle. It is throttled to
 * 10 lookups/minute per IP — a bound that only holds if one request can ask
 * about exactly one address.
 *
 * It looked the address up with `.ilike()` and no escaping. `_` is both a legal
 * email character and a LIKE single-character wildcard, so `a_b@example.com`
 * matched `axb@example.com`, `a1b@example.com` and every other one-character
 * variant — one request, many addresses, throttle defeated.
 */
describe("email-status enumeration hardening", () => {
  it("escapes the LIKE wildcards that are legal in an email address", () => {
    expect(escapeLikePattern("a_b@example.com")).toBe("a\\_b@example.com");
    expect(escapeLikePattern("a%b@example.com")).toBe("a\\%b@example.com");
  });

  it("escapes backslashes first, so the escape character cannot be smuggled", () => {
    // Naive ordering would emit "\\_" — a literal backslash followed by a LIVE
    // wildcard — turning an escape attempt back into a wildcard.
    expect(escapeLikePattern("a\\_b@example.com")).toBe("a\\\\\\_b@example.com");
  });

  it("leaves an ordinary address untouched", () => {
    expect(escapeLikePattern("first.last+tag@example.com")).toBe("first.last+tag@example.com");
  });

  it("collapses a wildcard probe to a single-address question", () => {
    // The property that matters: after escaping, no unescaped wildcard survives,
    // so the pattern can match at most the one address that was asked about.
    const probe = "___@example.com";
    const escaped = escapeLikePattern(probe);
    expect(escaped.replace(/\\[%_]/g, "")).not.toMatch(/[%_]/);
  });
});
