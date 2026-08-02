/**
 * Reads a listing out of a pasted advert.
 *
 * Roomi's inventory is collected by hand: an admin copies a post out of a
 * Telegram group, a WhatsApp chat, OLX, Instagram or a university chat and
 * re-publishes it here. Those posts are free-form Russian/Kazakh/English prose
 * with the useful bits scattered through them, so this module pulls out what it
 * can and leaves the rest alone.
 *
 * Design rules, all chosen so the admin can trust the result at a glance and
 * never has to undo it:
 *
 *  - EVERY field is a suggestion. Nothing here overwrites something the admin
 *    already typed; the caller only fills blanks (see `applyExtraction`).
 *  - A field is returned only when the text is unambiguous. A miss costs one
 *    manual entry; a wrong guess puts a stranger's phone number on a live
 *    listing, so the thresholds lean towards silence.
 *  - Every returned value is named in `found`, so the UI can say which fields
 *    it filled instead of silently rewriting the form.
 *
 * Two things about these posts drive the implementation and are easy to get
 * wrong:
 *
 *  1. `\b` is an ASCII word boundary. Cyrillic letters are not "word"
 *     characters to it, so `тг\b` never matches "150 000 тг". Unit suffixes use
 *     a `(?!\p{L})` lookahead instead.
 *  2. Labels bind by LINE, not by distance. "Тел: 8 700 …" followed on the next
 *     line by "WhatsApp: 8 747 …" put the two numbers ~20 characters apart, so a
 *     proximity window labels the phone as WhatsApp. Each line is read on its
 *     own, which is also how a person reads the post.
 */

import { normalizePhone, normalizeTelegram } from "@/lib/utils/contacts";

export interface ExtractedPost {
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  instagram?: string;
  monthlyRent?: number;
  genderPreference?: "any" | "male" | "female";
  availableFrom?: string;
  /** Field names actually extracted, for the "review these" hint. */
  found: string[];
}

/* ------------------------------------------------------------------ phones */

// Kazakhstani mobile numbers, in the dozen shapes people actually type:
// +7 700 123 45 67 · 8(700)1234567 · 87001234567 · 7 701 234-56-78.
const PHONE_RE = /(?:\+?7|8)[\s\-(.]*\d{3}[\s\-).]*\d{3}[\s\-.]*\d{2}[\s\-.]*\d{2}/g;

function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 11) return null;
  return normalizePhone(`+7${digits.slice(1)}`);
}

const WHATSAPP_WORDS = /(whats\s?app|ватсап|вотсап|ватс\s?ап|вацап|wa\.me)/i;
const TELEGRAM_WORDS = /(telegram|телеграм|телега|тг(?!\p{L})|tg(?!\p{L}))/iu;
// "директ"/"в дм" is how Instagram contact is phrased far more often than the
// word "Instagram" itself.
const INSTAGRAM_WORDS = /(instagram|инстаграм|инста|директ|инст(?!\p{L})|дм(?!\p{L})|\bdm\b|ig(?!\p{L}))/iu;

/* ---------------------------------------------------------------- handles */

const TELEGRAM_URL_RE = /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]{5,32})/i;
const INSTAGRAM_URL_RE = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]{2,30})/i;
// A bare @handle. The leading class stops it matching the @ inside an e-mail.
const AT_HANDLE_RE = /(?:^|[\s(,;:])@([a-zA-Z0-9_.]{4,32})/g;
const TELEGRAM_USERNAME_RE = /^[a-zA-Z0-9_]{5,32}$/;

/* ------------------------------------------------------------------ money */

// 150 000 ₸ · 150000 тг · 150 тенге · 180к · 200 тыс
const RENT_RE = /(\d[\d\s.,]{2,12})\s*(₸|тг|тенге|тнг|kzt)(?!\p{L})|(\d{2,4})\s*(к|k|тыс|тысяч)(?!\p{L})/giu;

const MIN_PLAUSIBLE_RENT = 10_000;
const MAX_PLAUSIBLE_RENT = 5_000_000;

/* ------------------------------------------------------------------ dates */

const MONTHS: Record<string, number> = {
  январ: 0, қаңтар: 0, january: 0, jan: 0,
  феврал: 1, ақпан: 1, february: 1, feb: 1,
  март: 2, наурыз: 2, march: 2, mar: 2,
  апрел: 3, сәуір: 3, april: 3, apr: 3,
  мая: 4, май: 4, мамыр: 4, may: 4,
  июн: 5, маусым: 5, june: 5, jun: 5,
  июл: 6, шілде: 6, july: 6, jul: 6,
  август: 7, тамыз: 7, august: 7, aug: 7,
  сентябр: 8, қыркүйек: 8, september: 8, sep: 8,
  октябр: 9, қазан: 9, october: 9, oct: 9,
  ноябр: 10, қараша: 10, november: 10, nov: 10,
  декабр: 11, желтоқсан: 11, december: 11, dec: 11
};

const NUMERIC_DATE_RE = /\b(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?\b/g;
const WORDED_DATE_RE = /\b(\d{1,2})\s*-?\s*(?:го|ое|е)?\s+([\p{L}]{3,12})/gu;
const IMMEDIATE_RE = /(сейчас|сегодня|срочно|қазір|бүгін|now|immediately|asap|today)/i;

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * "с 1 сентября", "01.09.2026", "заселение 15 августа", "сегодня".
 *
 * Every candidate is tried, not just the first: a post reads "10 минут пешком"
 * long before it reads "с 1 сентября", and only the second is a date. A bare
 * day-and-month with no year means the NEXT such date — a post saying
 * "с 1 марта" in August means next March, not one five months gone.
 */
function extractDate(text: string, today: Date): string | undefined {
  for (const m of text.matchAll(NUMERIC_DATE_RE)) {
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    if (day < 1 || day > 31 || month < 0 || month > 11) continue;
    const explicitYear = m[3] ? (Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3])) : null;
    const d = new Date(explicitYear ?? today.getFullYear(), month, day);
    if (Number.isNaN(d.getTime())) continue;
    if (explicitYear === null && d < today) d.setFullYear(d.getFullYear() + 1);
    return isoDate(d);
  }

  for (const m of text.matchAll(WORDED_DATE_RE)) {
    const day = Number(m[1]);
    if (day < 1 || day > 31) continue;
    const word = m[2].toLowerCase();
    const key = Object.keys(MONTHS).find((month) => word.startsWith(month));
    if (!key) continue;
    const d = new Date(today.getFullYear(), MONTHS[key], day);
    if (d < today) d.setFullYear(d.getFullYear() + 1);
    return isoDate(d);
  }

  if (IMMEDIATE_RE.test(text)) return isoDate(today);
  return undefined;
}

/* ----------------------------------------------------------------- gender */

// Deliberately narrow: a post merely mentioning a woman is not a requirement
// that the tenant be one. `\bmale\b` matters — an unanchored "male" also
// matches inside "female", which would make every female-only post ambiguous.
const FEMALE_RE = /(девушк|девочк|қызға|(?<!\p{L})қыз(?!\p{L})|\bgirls?\b|\bfemale\b|\bwomen\b)/iu;
// `парн(?:и|я|ю|е|ем|ей)` and not a bare `парн` stem: "парная" is a steam room,
// which a flat advert may well mention, and is not a tenant requirement.
const MALE_RE = /(парн(?:и|я|ю|е|ем|ей)(?!\p{L})|парень|мужчин|жігіт|(?<!\p{L})ұлға(?!\p{L})|\bboys?\b|\bmale\b|\bmen\b)/iu;

/* -------------------------------------------------------------------- api */

export function extractFromPost(text: string, today = new Date()): ExtractedPost {
  const result: ExtractedPost = { found: [] };
  const trimmed = text.trim();
  if (!trimmed) return result;

  const mark = (field: string) => {
    if (!result.found.includes(field)) result.found.push(field);
  };

  const lines = trimmed.split(/\r?\n/);

  // --- phone / whatsapp, read line by line --------------------------------
  // A post commonly lists one number and labels it "WhatsApp". That number is
  // then both the phone and the WhatsApp contact — which is what the landlord
  // means — so it is assigned to both rather than to whichever matched first.
  const whatsappNumbers: string[] = [];
  const plainNumbers: string[] = [];
  for (const line of lines) {
    const isWhatsappLine = WHATSAPP_WORDS.test(line);
    for (const raw of line.match(PHONE_RE) ?? []) {
      const number = toE164(raw);
      if (!number) continue;
      const bucket = isWhatsappLine ? whatsappNumbers : plainNumbers;
      if (!bucket.includes(number)) bucket.push(number);
    }
  }

  const phone = plainNumbers[0] ?? whatsappNumbers[0];
  if (phone) {
    result.phone = phone;
    mark("phone");
  }
  if (whatsappNumbers[0]) {
    result.whatsapp = whatsappNumbers[0];
    mark("whatsapp");
  } else if (phone && WHATSAPP_WORDS.test(trimmed)) {
    // WhatsApp named somewhere in the post, one number in it: same number.
    result.whatsapp = phone;
    mark("whatsapp");
  }

  // --- explicit profile links win over anything inferred ------------------
  const tgUrl = trimmed.match(TELEGRAM_URL_RE);
  if (tgUrl) {
    result.telegram = normalizeTelegram(tgUrl[1]);
    mark("telegram");
  }

  const igUrl = trimmed.match(INSTAGRAM_URL_RE);
  if (igUrl) {
    result.instagram = igUrl[1].replace(/[/.]+$/, "");
    mark("instagram");
  }

  // --- bare @handles, resolved by what the same line calls them ----------
  for (const line of lines) {
    const saysInstagram = INSTAGRAM_WORDS.test(line);
    const saysTelegram = TELEGRAM_WORDS.test(line);
    for (const m of line.matchAll(AT_HANDLE_RE)) {
      const handle = m[1];
      if (saysInstagram && !saysTelegram) {
        if (!result.instagram) {
          result.instagram = handle;
          mark("instagram");
        }
        continue;
      }
      if (!result.telegram && TELEGRAM_USERNAME_RE.test(handle)) {
        // Either the line says Telegram, or the handle is unlabelled — and an
        // unlabelled @handle in a rental post is a Telegram username far more
        // often than anything else. The admin verifies it with one click.
        result.telegram = handle;
        mark("telegram");
      } else if (!saysTelegram && !result.instagram && handle.includes(".")) {
        // Telegram usernames cannot contain a full stop, so a dotted handle is
        // an Instagram one whatever the line calls it.
        result.instagram = handle;
        mark("instagram");
      }
    }
  }

  // --- rent ---------------------------------------------------------------
  // The largest plausible figure wins: posts often quote a deposit or a
  // per-person share next to the rent, and the rent is the bigger number.
  let rent = 0;
  for (const m of trimmed.matchAll(RENT_RE)) {
    const value = m[1] ? Number(m[1].replace(/\D/g, "")) : Number(m[3]) * 1000;
    if (value >= MIN_PLAUSIBLE_RENT && value <= MAX_PLAUSIBLE_RENT && value > rent) rent = value;
  }
  if (rent) {
    result.monthlyRent = rent;
    mark("monthlyRent");
  }

  // --- gender -------------------------------------------------------------
  const female = FEMALE_RE.test(trimmed);
  const male = MALE_RE.test(trimmed);
  if (female !== male) {
    result.genderPreference = female ? "female" : "male";
    mark("genderPreference");
  }

  // --- move-in date -------------------------------------------------------
  const date = extractDate(trimmed, today);
  if (date) {
    result.availableFrom = date;
    mark("availableFrom");
  }

  return result;
}

/**
 * Merges an extraction into a form state, filling only the blanks.
 *
 * The admin's own typing always wins — re-pasting a post can never overwrite a
 * correction they just made. Returns the field names that changed so the UI can
 * name them ("filled in: phone, rent") instead of quietly editing the form.
 */
export function applyExtraction<T extends object>(
  form: T,
  extracted: ExtractedPost,
  isBlank: (key: keyof T, value: unknown) => boolean = (_k, v) =>
    v === "" || v === 0 || v === undefined || v === null
): { next: T; filled: string[] } {
  const next = { ...form };
  const filled: string[] = [];

  for (const key of extracted.found) {
    if (!(key in next)) continue;
    const typed = key as keyof T;
    if (!isBlank(typed, next[typed])) continue;
    const value = extracted[key as keyof ExtractedPost];
    if (value === undefined) continue;
    next[typed] = value as T[keyof T];
    filled.push(key);
  }

  return { next, filled };
}
