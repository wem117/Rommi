import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private, auth-gated, and API surfaces should never be indexed.
        disallow: ["/admin", "/api/", "/inbox", "/favorites", "/profile", "/onboarding", "/list-a-room"]
      }
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url
  };
}
