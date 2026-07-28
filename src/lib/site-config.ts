/**
 * Single source of truth for site-wide identity and SEO metadata.
 * `url` drives `metadataBase`, canonical URLs, the sitemap, and robots rules.
 */
/** Official production origin. Used when no explicit URL is configured. */
const PRODUCTION_URL = "https://roomi.kz";

function resolveSiteUrl() {
  // An explicit value always wins (custom domains, staging, previews).
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // Falling back to localhost in production would publish localhost URLs in
  // canonical tags, the sitemap, robots.txt and Open Graph images.
  return process.env.NODE_ENV === "production" ? PRODUCTION_URL : "http://localhost:3000";
}

const rawSiteUrl = resolveSiteUrl();

export const siteConfig = {
  name: "Roomi",
  shortName: "Roomi",
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
