"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useDebounce } from "@/hooks/use-debounce";
import { getListings } from "@/lib/data/listings";
import { debugSupabaseError, friendlySupabaseError } from "@/lib/utils/errors";
import { type AsyncStatus, withRetry } from "@/lib/utils/retry";
import type { Listing } from "@/types/listing";

const PAGE_SIZE = 9;

export interface ListingFilters {
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

// Serialized key of the "no filters, default sort" state. When the initial
// (SSR-seeded) render matches this, we can trust the server-provided first page
// and skip the first client fetch.
const DEFAULT_FILTERS_KEY = JSON.stringify({
  city: "",
  university: "",
  listingType: "",
  propertyType: "",
  minRent: "",
  maxRent: "",
  genderPreference: "",
  smoking: "",
  pets: "",
  sort: "newest"
});

export function useListings(
  filters: ListingFilters = {},
  initial?: { listings: Listing[]; hasMore: boolean }
) {
  const [listings, setListings] = useState<Listing[]>(initial?.listings ?? []);
  const [loading, setLoading] = useState(!initial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AsyncStatus>(initial ? "success" : "idle");
  const [hasMore, setHasMore] = useState(initial?.hasMore ?? false);
  const debouncedSearch = useDebounce(filters.search ?? "", 250);
  // True until the seeded first page has been consumed by the initial effect.
  const seededRef = useRef(Boolean(initial));

  // Callers pass a fresh `filters` object every render. Depending on its object
  // identity would re-run the fetch effect forever (the Saved Rooms flashing
  // loop). Instead, drive refetching off a stable serialization of the filter
  // *values*, and read the latest filters through a ref inside the callback.
  const filtersKey = JSON.stringify({
    city: filters.city ?? "",
    university: filters.university ?? "",
    listingType: filters.listingType ?? "",
    propertyType: filters.propertyType ?? "",
    minRent: filters.minRent ?? "",
    maxRent: filters.maxRent ?? "",
    genderPreference: filters.genderPreference ?? "",
    smoking: filters.smoking ?? "",
    pets: filters.pets ?? "",
    sort: filters.sort ?? "newest"
  });

  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const pageRef = useRef(1);

  const loadListings = useCallback(
    async (mode: "initial" | "more" = "initial") => {
      const nextPage = mode === "initial" ? 1 : pageRef.current + 1;

      if (mode === "initial") {
        setLoading(true);
        setError(null);
        setStatus("loading");
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await withRetry(
          () => getListings({ ...filtersRef.current, search: debouncedSearch }, nextPage, PAGE_SIZE),
          {
            onRetry: () => setStatus("retrying")
          }
        );
        pageRef.current = nextPage;
        setHasMore(response.hasMore);
        setListings((current) => (mode === "more" ? [...current, ...response.listings] : response.listings));
        setStatus("success");
      } catch (loadError) {
        console.error("Load listings failed", debugSupabaseError(loadError));
        setError(
          friendlySupabaseError(loadError, "Could not load listings. Check Supabase configuration and policies.")
        );
        setStatus("error");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch]
  );

  // Refetch from page 1 only when filter values or the debounced search change.
  // `loadListings` is stable (deps: debouncedSearch), so this can't self-trigger.
  useEffect(() => {
    pageRef.current = 1;

    // First run with an SSR-provided page: if the filter state is still the
    // default (which is what the server rendered), keep the seed instead of
    // immediately refetching the same data.
    if (seededRef.current) {
      seededRef.current = false;
      if (filtersKey === DEFAULT_FILTERS_KEY && !debouncedSearch) {
        return;
      }
    }

    void loadListings("initial");
  }, [filtersKey, loadListings, debouncedSearch]);

  return {
    listings,
    loading,
    loadingMore,
    error,
    status,
    hasMore,
    reload: () => loadListings("initial"),
    loadMore: () => loadListings("more")
  };
}
