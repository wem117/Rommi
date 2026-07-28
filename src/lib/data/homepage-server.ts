import "server-only";

import { getFeaturedListings } from "@/lib/data/listings";
import { getFeaturedRoommates } from "@/lib/data/profiles";
import { fetchPublicSettings, type PublicSettings } from "@/lib/data/public-settings";
import { getActiveTestimonials, type Testimonial } from "@/lib/data/testimonials";
import { getFeaturedUniversities, type UniversityWithStats } from "@/lib/data/universities";
import { createSupabasePublicServerClient } from "@/lib/supabase/public-server-client";
import type { Listing } from "@/types/listing";
import type { UserProfile } from "@/types/user";

export interface HomepageData {
  settings: PublicSettings;
  testimonials: Testimonial[];
  universities: UniversityWithStats[];
  featuredListings: Listing[];
  featuredRoommates: UserProfile[];
}

/**
 * Aggregates every homepage data source in one server round-trip using the anon
 * public server client, so the home page can render as a Server Component (SEO +
 * fast first paint) instead of firing five client-side fetches after hydration.
 * Reuses the existing data services (client-agnostic) so parsing/fallbacks stay
 * in one place.
 */
export async function getHomepageData(): Promise<HomepageData> {
  const client = createSupabasePublicServerClient() ?? undefined;

  // Settings first (drives the featured limits), then the rest in parallel.
  const settings = await fetchPublicSettings(client);

  const [testimonials, universities, featuredListings, featuredRoommates] = await Promise.all([
    getActiveTestimonials(client),
    getFeaturedUniversities(6, client),
    getFeaturedListings(settings.featuredListingsLimit, client),
    getFeaturedRoommates(settings.featuredRoommatesLimit, client)
  ]);

  return { settings, testimonials, universities, featuredListings, featuredRoommates };
}
