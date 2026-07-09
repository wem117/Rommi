"use client";

import { useCallback, useEffect, useState } from "react";

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
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(filters.search ?? "", 250);

  const loadListings = useCallback(
    async (mode: "initial" | "more" = "initial") => {
      const nextPage = mode === "initial" ? 1 : page + 1;

      if (mode === "initial") {
        setLoading(true);
        setPage(1);
        setError(null);
        setStatus("loading");
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await withRetry(
          () => getListings({ ...filters, search: debouncedSearch }, nextPage, PAGE_SIZE),
          {
            onRetry: () => setStatus("retrying")
          }
        );
        setHasMore(response.hasMore);
        setListings((current) => (mode === "more" ? [...current, ...response.listings] : response.listings));
        setPage(nextPage);
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
    [debouncedSearch, filters, page]
  );

  useEffect(() => {
    void loadListings("initial");
  }, [loadListings]);

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
