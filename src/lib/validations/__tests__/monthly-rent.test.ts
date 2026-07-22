import { describe, expect, it } from "vitest";

import { isValidMonthlyRent, MAX_MONTHLY_RENT } from "@/lib/validations/monthly-rent";

describe("isValidMonthlyRent", () => {
  it("accepts values within range", () => {
    expect(isValidMonthlyRent(0)).toBe(true);
    expect(isValidMonthlyRent(150_000)).toBe(true);
    expect(isValidMonthlyRent(MAX_MONTHLY_RENT)).toBe(true);
  });

  it("rejects out-of-range, non-finite, and non-number values", () => {
    expect(isValidMonthlyRent(-1)).toBe(false);
    expect(isValidMonthlyRent(MAX_MONTHLY_RENT + 1)).toBe(false);
    expect(isValidMonthlyRent(Number.NaN)).toBe(false);
    expect(isValidMonthlyRent(Infinity)).toBe(false);
    expect(isValidMonthlyRent("150000")).toBe(false);
    expect(isValidMonthlyRent(null)).toBe(false);
  });
});
