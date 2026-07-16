/**
 * Prices and budgets always use full numeric formatting with thousands
 * separators (e.g. "150,000 ₸") — never abbreviations like "150K".
 */
export function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("en-US").format(value)} ₸`;
}

export function formatMonthlyRent(value: number) {
  return `${formatCurrency(value)}/mo`;
}

export function formatListingPrice(value: number, depositRequired?: boolean, depositAmount?: number) {
  if (!depositRequired || !depositAmount) {
    return `${formatCurrency(value)}/mo`;
  }

  return `${formatCurrency(value)}/mo + ${formatCurrency(depositAmount)}`;
}

export function formatDate(value: Date | null | undefined, locale = "en") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "kz" ? "kk" : locale, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(value);
}
