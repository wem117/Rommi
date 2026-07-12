import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private, auth-gated, and API surfaces should never be indexed. The
        // trailing slash on detail routes keeps the public list pages
        // (/rooms, /roommates) crawlable while excluding their gated detail pages.
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
