import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site-config";

/**
 * Public, crawlable routes only. The browse LIST pages (/rooms, /roommates) are
 * public and server-rendered; their DETAIL sub-pages now require authentication,
 * so they are intentionally excluded here and blocked in robots.ts. Auth-gated
 * pages (inbox, profile, admin…) are likewise excluded.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }> = [
    { path: "/", priority: 1, changeFrequency: "daily" },
    { path: "/rooms", priority: 0.9, changeFrequency: "hourly" },
    { path: "/roommates", priority: 0.9, changeFrequency: "hourly" },
    { path: "/universities", priority: 0.6, changeFrequency: "weekly" },
    { path: "/sign-in", priority: 0.4, changeFrequency: "monthly" },
    { path: "/sign-up", priority: 0.4, changeFrequency: "monthly" }
  ];

  return routes.map((route) => ({
    url: `${siteConfig.url}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority
  }));
}
