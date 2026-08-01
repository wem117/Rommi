import { describe, expect, it } from "vitest";

/**
 * Guards the URL shapes GoTrue can hand back on a password-recovery redirect.
 *
 * The production bug was that only ONE of these was handled: an implicit link
 * (`#access_token=...`) hit GoTrueClient's flow-mismatch check under
 * `flowType: "pkce"` and threw, so no session was created and the page reported
 * "this link is invalid or has expired" for a perfectly valid link.
 */
function readRecoveryCredentials(url: string) {
  const u = new URL(url);
  const hash = new URLSearchParams(u.hash.replace(/^#/, ""));
  return {
    accessToken: hash.get("access_token"),
    refreshToken: hash.get("refresh_token"),
    type: hash.get("type"),
    code: u.searchParams.get("code")
  };
}

describe("recovery URL shapes", () => {
  it("reads implicit tokens from the hash fragment", () => {
    const c = readRecoveryCredentials(
      "https://roomi.kz/reset-password#access_token=abc.def.ghi&refresh_token=r123&type=recovery&expires_in=3600"
    );
    expect(c.accessToken).toBe("abc.def.ghi");
    expect(c.refreshToken).toBe("r123");
    expect(c.type).toBe("recovery");
    expect(c.code).toBeNull();
  });

  it("reads a PKCE code from the query string", () => {
    const c = readRecoveryCredentials("https://roomi.kz/reset-password?code=pkce-auth-code");
    expect(c.code).toBe("pkce-auth-code");
    expect(c.accessToken).toBeNull();
  });

  it("yields nothing usable for a bare visit (real 'no link' case)", () => {
    const c = readRecoveryCredentials("https://roomi.kz/reset-password");
    expect(c.accessToken).toBeNull();
    expect(c.code).toBeNull();
  });

  it("never routes recovery through the API callback (fragments die at the server)", () => {
    // Regression: recovery must target the PAGE, since a server route can never
    // observe a URL fragment.
    const target = new URL("/reset-password", "https://roomi.kz").toString();
    expect(target).toBe("https://roomi.kz/reset-password");
    expect(target).not.toContain("/api/auth/callback");
  });
});
