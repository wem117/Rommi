import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site-config";

/**
 * Static, publicly-indexable routes. Auth-gated pages (inbox, profile, admin…)
 * are intentionally excluded and blocked in robots.ts. Dynamic listing/roommate
 * detail pages can be appended here once fetched from Supabase at build time.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
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
