import type { MetadataRoute } from "next";

import { getPublicListingIndex } from "@/lib/data/listings-server";
import { siteConfig } from "@/lib/site-config";

// Revalidate hourly so newly published listings enter the sitemap without a
// redeploy.
export const revalidate = 3600;

/**
 * Static public routes + every publicly-visible listing detail page. Auth-gated
 * pages (inbox, profile, admin…) and personal roommate profiles are excluded and
 * blocked in robots.ts.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: Array<{
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

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${siteConfig.url}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority
  }));

  // Dynamic listing detail pages. A load failure must never break the sitemap.
  let listingEntries: MetadataRoute.Sitemap = [];
  try {
    const listings = await getPublicListingIndex();
    listingEntries = listings.map((listing) => ({
      url: `${siteConfig.url}/rooms/${listing.id}`,
      lastModified: new Date(listing.updatedAt),
      changeFrequency: "weekly",
      priority: 0.7
    }));
  } catch {
    listingEntries = [];
  }

  return [...staticEntries, ...listingEntries];
}
