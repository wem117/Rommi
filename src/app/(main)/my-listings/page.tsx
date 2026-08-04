import type { Metadata } from "next";

import { getMyListingsServer } from "@/lib/data/my-listings";
import type { MyListingStatus } from "@/lib/utils/listing-status";
import { getPublicProfileByIdServer } from "@/lib/data/profiles-server";
import { requirePageAuth } from "@/lib/supabase/page-auth";
import { requireSessionUser } from "@/lib/supabase/session";

import MyListingsClient from "./my-listings-client";

// Per-user data, so never shared-cached.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My listings",
  robots: { index: false, follow: false }
};

type SearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePageAuth("/my-listings");
  const user = await requireSessionUser();
  const params = await searchParams;

  const status = (one(params.status) ?? "all") as MyListingStatus | "all";
  const sort = (one(params.sort) ?? "newest") as "newest" | "oldest" | "updated";
  const page = Math.max(1, Number(one(params.page) ?? "1") || 1);

  // Both fetched on the server, in parallel — the page renders complete rather
  // than assembling itself after hydration.
  //
  // The roommate "listing" is the user's OWN profile: this schema has no
  // separate roommate-listing table, a profile becomes a roommate listing when
  // `looking_for_apartment` is set. Inventing a table to mirror that would
  // duplicate data that already exists.
  const [listings, profile] = await Promise.all([
    getMyListingsServer(user.id, {
      search: one(params.q),
      city: one(params.city),
      status,
      sort,
      page
    }),
    getPublicProfileByIdServer(user.id)
  ]);

  return (
    <MyListingsClient
      initial={listings}
      profile={profile}
      filters={{ q: one(params.q) ?? "", city: one(params.city) ?? "", status, sort }}
    />
  );
}
