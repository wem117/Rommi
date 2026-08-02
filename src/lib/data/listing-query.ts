import { getUniversityCity } from "@/lib/constants/universities";
import type { Listing } from "@/types/listing";

/**
 * One definition of "a page of listings", shared by the browser client, the
 * server renderer and the URL.
 *
 * WHY THIS EXISTS
 * ---------------
 * The filter clauses used to be written out twice — once in `lib/data/listings.ts`
 * for the client and once in `lib/data/listings-server.ts` for SSR — and the page
 * number lived only in React state. Three consequences, all of which this module
 * removes by construction:
 *
 *  1. The two copies could disagree, so the server-rendered first page and the
 *     first client fetch were not guaranteed to be the same rows.
 *  2. A total count had nowhere to come from: the query fetched `pageSize + 1`
 *     rows and inferred `hasMore` from the extra one, which answers "is there
 *     another page" but never "how many are there". The UI therefore counted the
 *     array it was holding — 9 after the first load, 14 after "Load more".
 *  3. The page number was not in the URL, so it could not be shared, crawled,
 *     restored on refresh, or server-rendered.
 *
 * Everything below is pure: no Supabase import, no React. It is the vocabulary
 * the data layer, the page and the pagination control all speak.
 */

/** 15 per page, per the product requirement. */
export const LISTINGS_PAGE_SIZE = 15;

export interface ListingQueryFilters {
  city?: string;
  university?: string;
  listingType?: Listing["listingType"] | "";
  propertyType?: Listing["propertyType"] | "";
  minRent?: number | "";
  maxRent?: number | "";
  genderPreference?: Listing["preferences"]["genderPreference"] | "";
  smoking?: Listing["preferences"]["smoking"] | "";
  pets?: Listing["preferences"]["pets"] | "";
  search?: string;
  sort?: "newest" | "rent_asc" | "rent_desc";
}

export interface ListingPage {
  listings: Listing[];
  /** Total rows matching the filters — NOT the length of `listings`. */
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const EMPTY_LISTING_PAGE: ListingPage = {
  listings: [],
  total: 0,
  page: 1,
  pageSize: LISTINGS_PAGE_SIZE,
  totalPages: 0
};

/**
 * The subset of the PostgREST builder this module needs.
 *
 * Describing it structurally keeps this file free of a Supabase import, so it
 * stays usable from a pure unit test and from both client and server callers.
 * `applyListingFilters` is generic in the CALLER's type and casts to this
 * interface internally rather than constraining the caller to it: a Supabase
 * query builder's own type is deeply recursive, and constraining it directly
 * makes tsc give up with "type instantiation is excessively deep".
 */
interface QueryOps {
  eq(column: string, value: unknown): QueryOps;
  gte(column: string, value: unknown): QueryOps;
  lte(column: string, value: unknown): QueryOps;
  or(filters: string): QueryOps;
  order(column: string, options: { ascending: boolean }): QueryOps;
}

/** PostgREST `or=(...)` is comma/parenthesis delimited, so those must not survive. */
export function sanitiseSearch(search: string | undefined): string {
  return (search ?? "").trim().replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Applies every filter clause to a query builder.
 *
 * `includeRemovedFilter` exists because the `removed` column post-dates some
 * deployments; the caller retries without it when the database reports the
 * column missing, exactly as before.
 */
export function applyListingFilters<T>(
  query: T,
  filters: ListingQueryFilters,
  includeRemovedFilter = true
): T {
  let next = query as QueryOps;

  if (includeRemovedFilter) {
    next = next.or("removed.is.null,removed.eq.false");
  }

  if (filters.city) next = next.eq("city", filters.city);
  if (filters.university) {
    // A listing with no university of its own still belongs to a university's
    // city, so it stays in that university's results.
    const fallbackCity = getUniversityCity(filters.university);
    next = next.or(
      `university.eq.${filters.university},and(university.is.null,city.eq.${fallbackCity}),and(university.eq.,city.eq.${fallbackCity})`
    );
  }
  if (filters.listingType) next = next.eq("listing_type", filters.listingType);
  if (filters.propertyType) next = next.eq("property_type", filters.propertyType);
  if (filters.genderPreference) next = next.eq("preferences->>genderPreference", filters.genderPreference);
  if (filters.smoking) next = next.eq("preferences->>smoking", filters.smoking);
  if (filters.pets) next = next.eq("preferences->>pets", filters.pets);
  if (filters.minRent !== undefined && filters.minRent !== "") {
    next = next.gte("monthly_rent", Number(filters.minRent));
  }
  if (filters.maxRent !== undefined && filters.maxRent !== "") {
    next = next.lte("monthly_rent", Number(filters.maxRent));
  }

  const search = sanitiseSearch(filters.search);
  if (search) {
    const pattern = `%${search}%`;
    next = next.or(
      `title.ilike.${pattern},description.ilike.${pattern},city.ilike.${pattern},district.ilike.${pattern},address.ilike.${pattern}`
    );
  }

  if (filters.sort === "rent_asc") next = next.order("monthly_rent", { ascending: true });
  else if (filters.sort === "rent_desc") next = next.order("monthly_rent", { ascending: false });
  else next = next.order("created_at", { ascending: false });

  return next as T;
}

/* ------------------------------------------------------------------- URL */

const SORTS = new Set(["newest", "rent_asc", "rent_desc"]);
const LISTING_TYPES = new Set(["private_room", "shared_room", "entire_place"]);
const PROPERTY_TYPES = new Set(["apartment", "house", "dorm", "studio"]);
const GENDERS = new Set(["any", "male", "female"]);
const SMOKING = new Set(["no", "yes"]);
const PETS = new Set(["no_pets", "allowed"]);

function pick<T extends string>(value: string | null | undefined, allowed: ReadonlySet<string>): T | "" {
  return value && allowed.has(value) ? (value as T) : "";
}

function positiveNumber(value: string | null | undefined): number | "" {
  if (!value) return "";
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : "";
}

/** Anything a visitor can type into the query string, validated into filters. */
export function parseListingFilters(params: URLSearchParams): ListingQueryFilters {
  return {
    city: params.get("city") ?? "",
    university: params.get("university") ?? "",
    listingType: pick<NonNullable<ListingQueryFilters["listingType"]>>(params.get("listingType"), LISTING_TYPES),
    propertyType: pick<NonNullable<ListingQueryFilters["propertyType"]>>(params.get("propertyType"), PROPERTY_TYPES),
    minRent: positiveNumber(params.get("minRent")),
    maxRent: positiveNumber(params.get("maxRent")),
    genderPreference: pick<NonNullable<ListingQueryFilters["genderPreference"]>>(params.get("genderPreference"), GENDERS),
    smoking: pick<NonNullable<ListingQueryFilters["smoking"]>>(params.get("smoking"), SMOKING),
    pets: pick<NonNullable<ListingQueryFilters["pets"]>>(params.get("pets"), PETS),
    search: params.get("search") ?? "",
    sort: (pick<NonNullable<ListingQueryFilters["sort"]>>(params.get("sort"), SORTS) || "newest") as ListingQueryFilters["sort"]
  };
}

/**
 * `?page=abc`, `?page=0`, `?page=-3` and `?page=1e3` all mean page 1.
 *
 * Plain digits only: `Number("1e3")` is a perfectly good integer, and accepting
 * it would mint a second URL for a page that already has one.
 */
export function parsePageParam(value: string | null | undefined): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 1 ? n : 1;
}

/**
 * Serialises filters + page back into a query string.
 *
 * Empty values are omitted and `page=1` is left implicit, so the canonical URL
 * for an unfiltered first page is a bare `/rooms` — one address for one page of
 * content, which is what a crawler needs.
 */
export function buildListingQueryString(filters: ListingQueryFilters, page = 1): string {
  const params = new URLSearchParams();
  const put = (key: string, value: unknown) => {
    const text = String(value ?? "").trim();
    if (text) params.set(key, text);
  };

  put("city", filters.city);
  put("university", filters.university);
  put("listingType", filters.listingType);
  put("propertyType", filters.propertyType);
  put("minRent", filters.minRent);
  put("maxRent", filters.maxRent);
  put("genderPreference", filters.genderPreference);
  put("smoking", filters.smoking);
  put("pets", filters.pets);
  put("search", filters.search);
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/* ------------------------------------------------------------ pagination */

export function totalPagesFor(total: number, pageSize = LISTINGS_PAGE_SIZE): number {
  if (total <= 0 || pageSize <= 0) return 0;
  return Math.ceil(total / pageSize);
}

/**
 * The page numbers to render, with `null` marking an elided run.
 *
 * First and last are always present so the ends of the range stay reachable in
 * one click; the current page keeps neighbours on both sides. 301 listings at 15
 * per page is 21 pages, which renders as 1 … 9 10 [11] 12 13 … 21 rather than 21
 * buttons that would wrap on a phone.
 */
export function pageNumbers(current: number, totalPages: number, siblings = 1): Array<number | null> {
  if (totalPages <= 0) return [];
  const clamped = Math.min(Math.max(current, 1), totalPages);

  // Up to seven pages fit on a phone without wrapping, and eliding one of them
  // would cost a tap while saving no room.
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages = new Set<number>([1, totalPages]);
  for (let p = clamped - siblings; p <= clamped + siblings; p += 1) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | null> = [];
  let previous: number | null = null;
  for (const page of sorted) {
    // A single missing page is shown rather than replaced by an ellipsis that
    // would take up the same room and say less.
    if (previous !== null && page - previous > 1) out.push(page - previous === 2 ? page - 1 : null);
    out.push(page);
    previous = page;
  }
  return out;
}

/** Index of the first row on a page, for `range(from, to)`. */
export function rangeFor(page: number, pageSize = LISTINGS_PAGE_SIZE): { from: number; to: number } {
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}
