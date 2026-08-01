import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { establishRecoverySession } from "@/lib/supabase/recovery";

/**
 * Behavioural guards for the password-recovery session handshake.
 *
 * Every case here corresponds to a way the production flow actually broke:
 * an implicit link that supabase-js refuses to parse under flowType:"pkce",
 * a PKCE link opened on a device that has no code_verifier, and a stale
 * session silently outranking the credentials from the email.
 */

const setSession = vi.fn();
const exchangeCodeForSession = vi.fn();
const getSession = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    auth: { setSession, exchangeCodeForSession, getSession }
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
  setSession.mockReset();
  exchangeCodeForSession.mockReset();
  getSession.mockReset();
  getSession.mockResolvedValue({ data: { session: null }, error: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("establishRecoverySession", () => {
  it("installs implicit fragment tokens with setSession()", async () => {
    const { replaceState } = visit(
      "https://roomi.kz/reset-password#access_token=abc.def.ghi&refresh_token=r123&type=recovery&expires_in=3600"
    );
    setSession.mockResolvedValue({ data: { session: SESSION }, error: null });

    await expect(establishRecoverySession()).resolves.toBe(true);
    expect(setSession).toHaveBeenCalledWith({ access_token: "abc.def.ghi", refresh_token: "r123" });
    // exchangeCodeForSession would throw a flow-mismatch error on this URL.
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    // Tokens must not be left in history / the Referer header.
    expect(replaceState).toHaveBeenCalledWith(null, "", "/reset-password");
  });

  it("exchanges a PKCE code from the query string", async () => {
    visit("https://roomi.kz/reset-password?code=pkce-auth-code");
    exchangeCodeForSession.mockResolvedValue({ data: { session: SESSION }, error: null });

    await expect(establishRecoverySession()).resolves.toBe(true);
    expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-auth-code");
    expect(setSession).not.toHaveBeenCalled();
  });

  it("reports failure when a PKCE code cannot be redeemed on this device", async () => {
    // The real cross-device case: no code_verifier in this browser's storage.
    visit("https://roomi.kz/reset-password?code=pkce-auth-code");
    exchangeCodeForSession.mockResolvedValue({ data: { session: null }, error: new Error("invalid request") });

    await expect(establishRecoverySession()).resolves.toBe(false);
  });

  it("prefers the URL credentials over a session that is already signed in", async () => {
    // Regression: checking getSession() first let a stale/other account's
    // session win, so updateUser() would have changed the WRONG password.
    visit("https://roomi.kz/reset-password#access_token=fresh&refresh_token=fresh-r&type=recovery");
    getSession.mockResolvedValue({ data: { session: { user: { id: "someone-else" } } }, error: null });
    setSession.mockResolvedValue({ data: { session: SESSION }, error: null });

    await expect(establishRecoverySession()).resolves.toBe(true);
    expect(setSession).toHaveBeenCalledWith({ access_token: "fresh", refresh_token: "fresh-r" });
  });

  it("falls back to an existing session when the URL carries no credentials", async () => {
    // A signed-in user changing their password from settings.
    visit("https://roomi.kz/reset-password");
    getSession.mockResolvedValue({ data: { session: SESSION }, error: null });

    await expect(establishRecoverySession()).resolves.toBe(true);
    expect(setSession).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("returns false for a bare visit with no session at all", async () => {
    visit("https://roomi.kz/reset-password");

    await expect(establishRecoverySession()).resolves.toBe(false);
  });

  it("does nothing outside the browser", async () => {
    vi.stubGlobal("window", undefined);
    await expect(establishRecoverySession()).resolves.toBe(false);
    expect(getSession).not.toHaveBeenCalled();
  });
});
