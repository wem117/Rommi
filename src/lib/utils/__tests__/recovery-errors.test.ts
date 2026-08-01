import { describe, expect, it } from "vitest";

import { friendlySupabaseError } from "@/lib/utils/errors";

/**
 * Pins the recovery error mapping to what production GoTrue actually returns.
 *
 * Captured live from https://api.roomi.kz/auth/v1/verify by POSTing a bogus
 * credential of each kind. Both paths report the same `otp_expired` code but
 * different prose, which is exactly the trap: matching on the message alone
 * silently missed the link variant and fell through to a generic
 * "Something went wrong".
 */
class AuthApiErrorLike extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "AuthApiError";
    this.code = code;
    this.status = status;
  }
}

const EXPIRED = "That code or link has expired or was already used. Request a new password reset email.";

describe("friendlySupabaseError — password recovery", () => {
  it("maps a spent token_hash link", () => {
    // {"code":403,"error_code":"otp_expired","msg":"Email link is invalid or has expired"}
    const error = new AuthApiErrorLike("Email link is invalid or has expired", "otp_expired", 403);
    expect(friendlySupabaseError(error)).toBe(EXPIRED);
  });

  it("maps a wrong or expired 6-digit code", () => {
    // {"code":403,"error_code":"otp_expired","msg":"Token has expired or is invalid"}
    const error = new AuthApiErrorLike("Token has expired or is invalid", "otp_expired", 403);
    expect(friendlySupabaseError(error)).toBe(EXPIRED);
  });

  it("still maps by message when GoTrue sends no error_code", () => {
    expect(friendlySupabaseError(new Error("Token has expired or is invalid"))).toBe(EXPIRED);
  });

  it("maps the send-side rate limit to something the user can act on", () => {
    const error = new AuthApiErrorLike(
      "For security purposes, you can only request this after 51 seconds.",
      "over_email_send_rate_limit",
      429
    );
    expect(friendlySupabaseError(error)).toMatch(/wait a minute/i);
  });

  it("does not swallow an unrelated failure", () => {
    expect(friendlySupabaseError(new Error("boom"), "fallback")).toBe("fallback");
  });
});
