import { describe, expect, it } from "vitest";

import { safeRedirect } from "@/lib/utils/safe-redirect";

describe("safeRedirect", () => {
  it("allows same-origin absolute paths", () => {
    expect(safeRedirect("/inbox")).toBe("/inbox");
    expect(safeRedirect("/rooms/123")).toBe("/rooms/123");
  });

  it("rejects protocol-relative and absolute URLs (open-redirect)", () => {
    expect(safeRedirect("//evil.com")).toBe("/rooms");
    expect(safeRedirect("https://evil.com")).toBe("/rooms");
    expect(safeRedirect("/\\evil.com")).toBe("/rooms");
  });

  it("falls back on empty/nullish input", () => {
    expect(safeRedirect(null)).toBe("/rooms");
    expect(safeRedirect(undefined)).toBe("/rooms");
    expect(safeRedirect("")).toBe("/rooms");
  });

  it("honors a custom fallback", () => {
    expect(safeRedirect(null, "/profile")).toBe("/profile");
  });
});
