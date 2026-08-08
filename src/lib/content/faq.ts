/**
 * The homepage FAQ's question order.
 *
 * Kept apart from the component so the server can build FAQPage JSON-LD from
 * the same list the client renders — the markup and the visible text can never
 * drift into describing different questions.
 *
 * Each id resolves to `home.faq_<id>_q` and `home.faq_<id>_a` in lib/i18n.ts.
 */
export const FAQ_IDS = [
  "about",
  "how",
  "verified",
  "free",
  "roommate",
  "list",
  "contact",
  "safety",
  "report",
  "cities"
] as const;

export type FaqId = (typeof FAQ_IDS)[number];
