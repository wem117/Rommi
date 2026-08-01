import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { establishRecoverySession, verifyRecoveryCode } from "@/lib/supabase/recovery";

/**
 * Behavioural guards for the password-recovery handshake.
 *
 * Every case corresponds to a way the production flow actually broke: a
 * credential shape that was not handled, a stale session silently outranking
 * the one from the email, or a dead link dead-ending the user instead of
 * offering the code that arrived in the same message.
 */

const verifyOtp = vi.fn();
const setSession = vi.fn();
const exchangeCodeForSession = vi.fn();
const getSession = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    auth: { verifyOtp, setSession, exchangeCodeForSession, getSession }
  })
}));

const SESSION = { access_token: "at", refresh_token: "rt", user: { id: "u1" } };

/** Installs a minimal `window` for a given recovery URL. */
function visit(url: string) {
  const parsed = new URL(url);
  const replaceState = vi.fn();

  vi.stubGlobal("window", {
    location: {
      href: parsed.href,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash
    },
    history: { replaceState }
  });

  return { replaceState };
}

beforeEach(() => {
  verifyOtp.mockReset();
  setSession.mockReset();
  exchangeCodeForSession.mockReset();
  getSession.mockReset();
  getSession.mockResolvedValue({ data: { session: null }, error: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("establishRecoverySession", () => {
  it("redeems a token_hash link with verifyOtp", async () => {
    const { replaceState } = visit("https://roomi.kz/reset-password?token_hash=abc123&type=recovery");
    verifyOtp.mockResolvedValue({ data: { session: SESSION }, error: null });

    await expect(establishRecoverySession()).resolves.toEqual({ status: "authenticated" });
    // POST /verify — not browser-bound, and not consumable by a link prefetch.
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "abc123", type: "recovery" });
    // The credential must not survive in history or the Referer header.
    expect(replaceState).toHaveBeenCalledWith(null, "", "/reset-password");
  });

  it("falls back to the code entry, carrying the email, when the link is dead", async () => {
    visit("https://roomi.kz/reset-password?token_hash=spent&type=recovery&email=user%40roomi.kz");
    verifyOtp.mockResolvedValue({
      data: { session: null },
      error: new Error("Token has expired or is invalid")
    });

    await expect(establishRecoverySession()).resolves.toEqual({
      status: "failed",
      email: "user@roomi.kz",
      message: "Token has expired or is invalid"
    });
  });

  it("reports GoTrue's own error rather than attempting a doomed redemption", async () => {
    visit(
      "https://roomi.kz/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired"
    );

    await expect(establishRecoverySession()).resolves.toEqual({
      status: "failed",
      email: null,
      message: "Email link is invalid or has expired"
    });
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("still installs implicit fragment tokens from links already in inboxes", async () => {
    visit("https://roomi.kz/reset-password#access_token=abc.def&refresh_token=r123&type=recovery");
    setSession.mockResolvedValue({ data: { session: SESSION }, error: null });

    await expect(establishRecoverySession()).resolves.toEqual({ status: "authenticated" });
    expect(setSession).toHaveBeenCalledWith({ access_token: "abc.def", refresh_token: "r123" });
  });

  it("still exchanges a legacy PKCE code", async () => {
    visit("https://roomi.kz/reset-password?code=pkce-auth-code");
    exchangeCodeForSession.mockResolvedValue({ data: { session: SESSION }, error: null });

    await expect(establishRecoverySession()).resolves.toEqual({ status: "authenticated" });
    expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-auth-code");
  });

  it("prefers the URL credential over a session that is already signed in", async () => {
    // Regression: checking getSession() first let a stale or different account's
    // session win, so updateUser() would have changed the WRONG password.
    visit("https://roomi.kz/reset-password?token_hash=fresh&type=recovery");
    getSession.mockResolvedValue({ data: { session: { user: { id: "someone-else" } } }, error: null });
    verifyOtp.mockResolvedValue({ data: { session: SESSION }, error: null });

    await expect(establishRecoverySession()).resolves.toEqual({ status: "authenticated" });
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "fresh", type: "recovery" });
    expect(getSession).not.toHaveBeenCalled();
  });

  it("accepts an existing session when the URL carries no credential", async () => {
    // A signed-in user changing their password from settings.
    visit("https://roomi.kz/reset-password");
    getSession.mockResolvedValue({ data: { session: SESSION }, error: null });

    await expect(establishRecoverySession()).resolves.toEqual({ status: "authenticated" });
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("asks for the code, prefilled, on a bare visit with the email hint", async () => {
    visit("https://roomi.kz/reset-password?email=user%40roomi.kz");

    await expect(establishRecoverySession()).resolves.toEqual({
      status: "no-credentials",
      email: "user@roomi.kz"
    });
  });

  it("does nothing outside the browser", async () => {
    vi.stubGlobal("window", undefined);
    await expect(establishRecoverySession()).resolves.toEqual({ status: "no-credentials", email: null });
    expect(getSession).not.toHaveBeenCalled();
  });
});

describe("verifyRecoveryCode", () => {
  it("redeems the 6-digit code, normalising the email and stripping separators", async () => {
    verifyOtp.mockResolvedValue({ data: { session: SESSION }, error: null });

    await expect(verifyRecoveryCode("  User@Roomi.KZ ", "123 456")).resolves.toBeUndefined();
    expect(verifyOtp).toHaveBeenCalledWith({
      email: "user@roomi.kz",
      token: "123456",
      type: "recovery"
    });
  });

  it("throws GoTrue's error so the UI can explain an expired code", async () => {
    const error = new Error("Token has expired or is invalid");
    verifyOtp.mockResolvedValue({ data: { session: null }, error });

    await expect(verifyRecoveryCode("user@roomi.kz", "123456")).rejects.toThrow(error);
  });

  it("throws when the code is accepted but no session comes back", async () => {
    verifyOtp.mockResolvedValue({ data: { session: null }, error: null });

    await expect(verifyRecoveryCode("user@roomi.kz", "123456")).rejects.toThrow(/no session/i);
  });
});
