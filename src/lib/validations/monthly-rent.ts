export const MAX_MONTHLY_RENT = 10_000_000;

export function isValidMonthlyRent(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_MONTHLY_RENT;
}
