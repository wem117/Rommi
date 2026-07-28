import { afterEach, describe, expect, it, vi } from "vitest";

import { isAdminEmail } from "@/lib/auth/admin-access";

describe("isAdminEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("matches emails in ADMIN_EMAILS (case-insensitive, trimmed)", () => {
    vi.stubEnv("ADMIN_EMAILS", "Owner@Example.com, second@example.com");
    expect(isAdminEmail("owner@example.com")).toBe(true);
    expect(isAdminEmail("  SECOND@example.com ")).toBe(true);
    expect(isAdminEmail("stranger@example.com")).toBe(false);
  });

  it("fails closed in production when ADMIN_EMAILS is unset", () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(isAdminEmail("yeraly28.10@gmail.com")).toBe(false);
    expect(isAdminEmail("anyone@example.com")).toBe(false);
  });

  it("returns false for empty input", () => {
    vi.stubEnv("ADMIN_EMAILS", "owner@example.com");
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  });
});
