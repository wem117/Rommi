export function formatCurrency(value: number) {
  if (value >= 1000) {
    return `${Math.round(value / 1000)}K KZT`;
  }

  return `${new Intl.NumberFormat("kk-KZ").format(value)} KZT`;
}

export function formatMonthlyRent(value: number) {
  return `${formatCurrency(value)}/mo`;
}

export function formatListingPrice(value: number, depositRequired?: boolean, depositAmount?: number) {
  if (!depositRequired || !depositAmount) {
    return `${formatCurrency(value)}/month`;
  }

  return `${formatCurrency(value)}/month + ${formatCurrency(depositAmount)} deposit`;
}

export function formatDate(value: Date | null | undefined) {
  if (!value) return "Date not set";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(value);
}
