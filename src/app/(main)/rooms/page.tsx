import type { Metadata } from "next";

import { LISTINGS_PAGE_SIZE, buildListingQueryString, parseListingFilters, parsePageParam } from "@/lib/data/listing-query";
import { getListingFilterInventoryServer, getListingsPageServer } from "@/lib/data/listings-server";
import { siteConfig } from "@/lib/site-config";

import RoomsClient from "./rooms-client";

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Server-rendered browse page.
 *
 * The URL is the single source of truth for both filters and the page number,
 * so this component can render any page of any filter combination in its first
 * response. That is what makes pagination work for SSR and for crawlers — and
 * it is also why the counter is correct in the initial HTML instead of being
 * corrected after hydration.
 *
 * Reading `searchParams` opts the route into dynamic rendering; the previous
 * `revalidate = 120` ISR could only ever cache one page of one filter state, so
 * there is nothing to preserve there.
 */
export const dynamic = "force-dynamic";

function toURLSearchParams(input: SearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value) && value[0] !== undefined) params.set(key, value[0]);
  }
  return params;
}

export async function generateMetadata({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = toURLSearchParams(await searchParams);
  const filters = parseListingFilters(params);
  const page = parsePageParam(params.get("page"));

  const where = filters.city || filters.university;
  const scope = where ? ` in ${where}` : " across Kazakhstan";
  const suffix = page > 1 ? ` — page ${page}` : "";

  return {
    title: `Browse rooms & apartments for rent${suffix}`,
    description:
      `Browse student rooms and apartments for rent${scope}. Filter by city, university, budget, and lifestyle, ` +
      "then message the owner directly.",
    // Each page is its own canonical URL, so page 2 is indexable in its own
    // right rather than being folded into page 1.
    alternates: { canonical: `/rooms${buildListingQueryString(filters, page)}` },
    // Pages beyond the first add no new landing value and would compete with
    // the filtered pages for the same terms.
    robots: page > 1 ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      title: `Browse rooms & apartments for rent${suffix}`,
      url: `${siteConfig.url}/rooms${buildListingQueryString(filters, page)}`
    }
  };
}

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = toURLSearchParams(await searchParams);
  const filters = parseListingFilters(params);
  const page = parsePageParam(params.get("page"));

  // Independent of `filters`: the dropdowns must offer every city/university
  // that has SOME live listing, not just ones matching whatever is currently
  // selected — narrowing the options as the user filters would make it
  // impossible to change city and university in the same visit.
  const [result, inventory] = await Promise.all([
    getListingsPageServer(filters, page, LISTINGS_PAGE_SIZE),
    getListingFilterInventoryServer()
  ]);

  return <RoomsClient initial={result} filters={filters} inventory={inventory} />;
}
