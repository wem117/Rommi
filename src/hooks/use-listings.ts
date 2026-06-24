"use client";

import { useCallback, useEffect, useState } from "react";

import { useDebounce } from "@/hooks/use-debounce";
import { getListings } from "@/lib/data/listings";
import type { Listing } from "@/types/listing";

const PAGE_SIZE = 9;

export interface ListingFilters {
  city?: string;
  listingType?: Listing["listingType"] | "";
  minRent?: number | "";
  maxRent?: number | "";
  search?: string;
  sort?: "newest" | "rent_asc" | "rent_desc";
}

export function useListings(filters: ListingFilters = {}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await getListings({ ...filters, search: debouncedSearch }, nextPage, PAGE_SIZE);
        setHasMore(response.hasMore);
        setListings((current) => (mode === "more" ? [...current, ...response.listings] : response.listings));
        setPage(nextPage);
      } catch (loadError) {
        console.error("Load listings failed", loadError);
        setError("Could not load listings. Check Supabase configuration and policies.");
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
    hasMore,
    reload: () => loadListings("initial"),
    loadMore: () => loadListings("more")
  };
}
