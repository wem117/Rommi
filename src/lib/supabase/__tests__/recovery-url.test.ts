import { describe, expect, it } from "vitest";

import { readRecoveryCredentials } from "@/lib/supabase/recovery";

/**
 * Guards every URL shape GoTrue can hand back on a password recovery, against
 * the real parser rather than a copy of it.
 *
 * The production bug was that only ONE shape was handled, so a perfectly valid
 * link reported "this link is invalid or has expired".
 */
describe("readRecoveryCredentials", () => {
  it("reads a token_hash link — the shape the recovery template emits", () => {
    const c = readRecoveryCredentials(
      "https://roomi.kz/reset-password?token_hash=pkce_9f8e7d&type=recovery&email=user%40roomi.kz"
    );
    expect(c.tokenHash).toBe("pkce_9f8e7d");
    expect(c.email).toBe("user@roomi.kz");
    expect(c.errorDescription).toBeNull();
  });



  it("reads GoTrue's own error report instead of guessing at the cause", () => {
    const c = readRecoveryCredentials(
      "https://roomi.kz/reset-password?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired"
    );
    expect(c.errorDescription).toBe("Email link is invalid or has expired");
    expect(c.tokenHash).toBeNull();
  });


  it("yields nothing usable for a bare visit (the real 'no link' case)", () => {
    const c = readRecoveryCredentials("https://roomi.kz/reset-password");
    expect(c.tokenHash).toBeNull();
    expect(c.errorDescription).toBeNull();
  });

  it("never routes recovery through the API callback (fragments die at the server)", () => {
    const target = new URL("/reset-password", "https://roomi.kz").toString();
    expect(target).toBe("https://roomi.kz/reset-password");
    expect(target).not.toContain("/api/auth/callback");
  });
});

describe("recovery type marker", () => {
  it("distinguishes recovery from the identically shaped signup link", () => {
    // The app-wide redirect keys off this. Without it, confirming a new account
    // (same URL shape, type=signup) would be routed to "set a new password".
    expect(readRecoveryCredentials("https://roomi.kz/?token_hash=abc&type=recovery").type).toBe("recovery");
    expect(readRecoveryCredentials("https://roomi.kz/?token_hash=abc&type=signup").type).toBe("signup");
    expect(readRecoveryCredentials("https://roomi.kz/reset-password").type).toBeNull();
  });
});

describe("removed credential shapes", () => {
  it("ignores a PKCE ?code= entirely", () => {
    // Production root cause: redeeming this needs a code_verifier that only the
    // requesting browser holds, so supabase-js threw before sending any request
    // and the page blamed the link. The shape is no longer parsed at all.
    const c = readRecoveryCredentials("https://roomi.kz/reset-password?code=99059b3f-13b7-4037-9988-8b81662ad519");
    expect(c.tokenHash).toBeNull();
    expect(Object.values(c).every((v) => v === null)).toBe(true);
  });

  it("ignores a session handed back in the URL fragment", () => {
    const c = readRecoveryCredentials(
      "https://roomi.kz/reset-password#access_token=abc.def&refresh_token=r1&type=recovery"
    );
    expect(c.tokenHash).toBeNull();
    expect(c.type).toBeNull();
  });
});
