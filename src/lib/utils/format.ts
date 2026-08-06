/**
 * Deterministic number grouping. `Intl.NumberFormat("en-US")` is stable across
 * Node and the browser (unlike locale-default `toLocaleString()`, whose grouping
 * character varies), so this is safe to render during SSR without a mismatch.
 */
export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

/**
 * Prices and budgets always use full numeric formatting with thousands
 * separators (e.g. "150,000 ₸") — never abbreviations like "150K".
 */
export function formatCurrency(value: number) {
  return `${formatNumber(value)} ₸`;
}

export function formatMonthlyRent(value: number) {
  return `${formatCurrency(value)}/mo`;
}

/**
 * What a listing costs, or that nobody said.
 *
 * `null` is not the same as 0 and must not render as one: plenty of real posts
 * quote no price ("цена в ЛС", "по договорённости"), and showing "0 ₸" turns a
 * missing figure into a wrong one that reads as free. Callers pass the locale
 * label so the placeholder stays translated rather than hardcoded English.
 */
export function formatListingPrice(
  value: number | null | undefined,
  depositRequired?: boolean,
  depositAmount?: number,
  notSpecifiedLabel = "Price not specified"
) {
  if (value == null || value <= 0) return notSpecifiedLabel;

  if (!depositRequired || !depositAmount) {
    return `${formatCurrency(value)}/mo`;
  }

  return `${formatCurrency(value)}/mo + ${formatCurrency(depositAmount)}`;
}

/*
 * Deterministic, locale-aware date formatting.
 *
 * `Intl.DateTimeFormat` derives month names from the runtime's ICU data, which
 * DIFFERS between Node (server) and the browser (client) — e.g. Russian renders
 * "1 июл. 2026 г." on the server but "1 июля 2026 г." in the browser, causing a
 * React hydration mismatch. We instead format from explicit month tables and
 * read the date in UTC (getUTC*), so the output is byte-identical on both sides
 * regardless of ICU version or the runtime's timezone. No SSR disabling, no
 * suppression — just a formatter that can't diverge.
 */
type DateLocale = "en" | "ru" | "kz";

const MONTHS: Record<DateLocale, readonly string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  // Genitive forms — natural in a "1 <month> 2026" Russian date.
  ru: [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"
  ],
  kz: [
    "қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым",
    "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"
  ]
};

function normalizeLocale(locale: string): DateLocale {
  return locale === "ru" || locale === "kz" ? locale : "en";
}

/** Full date, e.g. "Jul 1, 2026" / "1 июля 2026 г." / "1 шілде 2026 ж." */
export function formatDate(value: Date | null | undefined, locale = "en") {
  if (!value) return "—";
  const loc = normalizeLocale(locale);
  const day = value.getUTCDate();
  const month = MONTHS[loc][value.getUTCMonth()];
  const year = value.getUTCFullYear();

  if (loc === "en") return `${month} ${day}, ${year}`;
  if (loc === "ru") return `${day} ${month} ${year} г.`;
  return `${day} ${month} ${year} ж.`;
}

/** Day + month only (no year), e.g. "Jul 1" / "1 июля" / "1 шілде". */
export function formatDateShort(value: Date | null | undefined, locale = "en") {
  if (!value) return "—";
  const loc = normalizeLocale(locale);
  const day = value.getUTCDate();
  const month = MONTHS[loc][value.getUTCMonth()];

  return loc === "en" ? `${month} ${day}` : `${day} ${month}`;
}
