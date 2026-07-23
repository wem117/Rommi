import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The public BROWSE list pages (/rooms, /roommates) stay crawlable for
        // SEO. Their DETAIL sub-pages now require authentication, so they are
        // excluded from crawling (the trailing slash keeps /rooms and /roommates
        // themselves allowed while blocking /rooms/<id>, /roommates/<id>).
        // Private/auth-gated/API surfaces are likewise excluded.
        disallow: [
          "/admin",
          "/api/",
          "/inbox",
          "/favorites",
          "/profile",
          "/onboarding",
          "/list-a-room",
          "/rooms/",
          "/roommates/",
          "/listings/"
        ]
      }
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url
  };
}
