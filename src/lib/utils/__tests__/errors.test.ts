import { describe, expect, it } from "vitest";

import { getErrorMessage, isMissingRpc, isMissingSupabaseTable } from "@/lib/utils/errors";

describe("getErrorMessage", () => {
  it("reads strings, Errors, and message fields", () => {
    expect(getErrorMessage("boom")).toBe("boom");
    expect(getErrorMessage(new Error("bang"))).toBe("bang");
    expect(getErrorMessage({ message: "pop" })).toBe("pop");
    expect(getErrorMessage(null)).toBe("");
  });
});

describe("isMissingRpc", () => {
  it("matches PostgREST/Postgres missing-function signals", () => {
    expect(isMissingRpc({ code: "PGRST202" })).toBe(true);
    expect(isMissingRpc({ code: "42883" })).toBe(true);
    expect(isMissingRpc({ message: "Could not find the function public.foo" })).toBe(true);
  });

  it("does not match unrelated errors", () => {
    expect(isMissingRpc({ code: "23505", message: "duplicate key" })).toBe(false);
  });
});

describe("isMissingSupabaseTable", () => {
  it("matches PGRST205 for the named table", () => {
    expect(
      isMissingSupabaseTable({ code: "PGRST205", message: "Could not find the table 'public.images'" }, "images")
    ).toBe(true);
  });

  it("does not match other codes", () => {
    expect(isMissingSupabaseTable({ code: "PGRST116", message: "public.images" }, "images")).toBe(false);
  });
});
