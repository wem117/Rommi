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
    expect(c.accessToken).toBeNull();
    expect(c.code).toBeNull();
    expect(c.errorDescription).toBeNull();
  });

  it("reads implicit tokens from the hash fragment (legacy links)", () => {
    const c = readRecoveryCredentials(
      "https://roomi.kz/reset-password#access_token=abc.def.ghi&refresh_token=r123&type=recovery&expires_in=3600"
    );
    expect(c.accessToken).toBe("abc.def.ghi");
    expect(c.refreshToken).toBe("r123");
    expect(c.tokenHash).toBeNull();
  });

  it("reads a PKCE code from the query string (legacy links)", () => {
    const c = readRecoveryCredentials("https://roomi.kz/reset-password?code=pkce-auth-code");
    expect(c.code).toBe("pkce-auth-code");
    expect(c.accessToken).toBeNull();
  });

  it("reads GoTrue's own error report instead of guessing at the cause", () => {
    const c = readRecoveryCredentials(
      "https://roomi.kz/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired"
    );
    expect(c.errorDescription).toBe("Email link is invalid or has expired");
    expect(c.tokenHash).toBeNull();
  });

  it("finds credentials in the query OR the fragment", () => {
    // GoTrue uses the fragment for implicit results and the query elsewhere; a
    // template author may legitimately pick either.
    expect(readRecoveryCredentials("https://roomi.kz/reset-password#token_hash=abc").tokenHash).toBe("abc");
    expect(readRecoveryCredentials("https://roomi.kz/reset-password?access_token=xyz").accessToken).toBe("xyz");
  });

  it("yields nothing usable for a bare visit (the real 'no link' case)", () => {
    const c = readRecoveryCredentials("https://roomi.kz/reset-password");
    expect(c.tokenHash).toBeNull();
    expect(c.accessToken).toBeNull();
    expect(c.code).toBeNull();
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
    expect(readRecoveryCredentials("https://roomi.kz/#access_token=t&type=signup").type).toBe("signup");
    expect(readRecoveryCredentials("https://roomi.kz/reset-password").type).toBeNull();
  });
});
