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

export function useListings(filters: ListingFilters = {}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AsyncStatus>("idle");
  const [hasMore, setHasMore] = useState(false);
  const debouncedSearch = useDebounce(filters.search ?? "", 250);

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
    void loadListings("initial");
  }, [filtersKey, loadListings]);

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
