/**
 * Single source of truth for site-wide identity and SEO metadata.
 * `url` drives `metadataBase`, canonical URLs, the sitemap, and robots rules.
 */
const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const siteConfig = {
  name: "Roommate KZ",
  shortName: "RoommateKZ",
  description:
    "Find trusted student roommates and rooms across Kazakhstan. Match by budget, university, and lifestyle — then chat before you move in.",
  // Normalized: no trailing slash.
  url: rawSiteUrl.replace(/\/$/, ""),
  ogImage: "/api/og",
  locale: "en_US",
  keywords: [
    "roommate Kazakhstan",
    "student housing Almaty",
    "rooms Astana",
    "find roommate",
    "аренда комнаты Казахстан",
    "жатақхана",
    "roommate finder",
    "student accommodation"
  ]
} as const;

export type SiteConfig = typeof siteConfig;
