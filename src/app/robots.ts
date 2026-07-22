import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private/auth-gated/API surfaces are never indexed. Listing detail
        // pages (/rooms/<id>) are now public + server-rendered, so they stay
        // crawlable. Roommate profiles are public but personal, so they are kept
        // out of crawling (and also carry a noindex in their own metadata).
        // Listing edit routes require auth and are excluded via /listings/.
        disallow: [
          "/admin",
          "/api/",
          "/inbox",
          "/favorites",
          "/profile",
          "/onboarding",
          "/list-a-room",
          "/roommates/",
          "/listings/"
        ]
      }
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url
  };
}
