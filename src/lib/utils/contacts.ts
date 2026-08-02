/**
 * Helpers for the optional Telegram username and phone number contact fields.
 * Normalization + validation + link/display formatting live here so the
 * profile form, public profile, and listing owner card all behave the same.
 */

/** Strip @, t.me/ prefixes, and whitespace, leaving the bare username. */
export function normalizeTelegram(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/(t\.me|telegram\.me)\//i, "")
    .replace(/^@/, "")
    .trim();
}

/** Telegram usernames are 5–32 chars: letters, digits, underscore. */
export function isValidTelegram(input: string): boolean {
  return /^[a-zA-Z0-9_]{5,32}$/.test(normalizeTelegram(input));
}

export function telegramHandle(input: string): string {
  const username = normalizeTelegram(input);
  return username ? `@${username}` : "";
}

export function telegramLink(input: string): string {
  return `https://t.me/${normalizeTelegram(input)}`;
}

/** Keep leading + and digits only. */
export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/[^\d]/g, "");
}

/** 10–15 digits (E.164-ish), optional leading +. */
export function isValidPhone(input: string): boolean {
  const digits = input.replace(/[^\d]/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function phoneLink(input: string): string {
  return `tel:${normalizePhone(input)}`;
}

/**
 * WhatsApp uses the same numbers as `phone`, so it reuses `isValidPhone`.
 * wa.me wants digits only — no plus, no spaces, no dashes.
 */
export function whatsappLink(input: string): string {
  return `https://wa.me/${input.replace(/\D/g, "")}`;
}

/** Strip @, a profile URL, and any trailing slash, leaving the bare handle. */
export function normalizeInstagram(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/+$/, "")
    .split(/[?#]/)[0]
    .trim();
}

/** Instagram handles are 1–30 chars: letters, digits, underscore, full stop. */
export function isValidInstagram(input: string): boolean {
  return /^[a-zA-Z0-9_.]{1,30}$/.test(normalizeInstagram(input));
}

export function instagramHandle(input: string): string {
  const username = normalizeInstagram(input);
  return username ? `@${username}` : "";
}

export function instagramLink(input: string): string {
  return `https://instagram.com/${normalizeInstagram(input)}`;
}

/** Pretty display for Kazakhstani numbers, otherwise a best-effort grouping. */
export function formatPhone(input: string): string {
  const digits = input.replace(/[^\d]/g, "");
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    const d = "7" + digits.slice(1);
    return `+${d.slice(0, 1)} ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
  }
  if (digits.length === 10) {
    return `+7 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  }
  return normalizePhone(input);
}
