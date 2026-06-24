"use client";

import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type QueryDocumentSnapshot
} from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";

import { converter, timestampToDate } from "@/lib/firebase/firestore";
import { useDebounce } from "@/hooks/use-debounce";
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

function normalizeListing(data: Listing, id: string): Listing {
  return {
    ...data,
    id,
    availableFrom: timestampToDate(data.availableFrom) ?? new Date(),
    createdAt: timestampToDate(data.createdAt) ?? new Date(),
    updatedAt: timestampToDate(data.updatedAt) ?? new Date()
  };
}

export function useListings(filters: ListingFilters = {}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const lastDocRef = useRef<QueryDocumentSnapshot<Listing> | null>(null);
  const debouncedSearch = useDebounce(filters.search ?? "", 250);

  const loadListings = useCallback(async (mode: "initial" | "more" = "initial") => {
    if (mode === "initial") {
      setLoading(true);
      setError(null);
      lastDocRef.current = null;
    } else {
      setLoadingMore(true);
    }

    try {
      const { db } = await import("@/lib/firebase/client");
      const constraints = [];
      if (filters.city) constraints.push(where("city", "==", filters.city));
      if (filters.listingType) constraints.push(where("listingType", "==", filters.listingType));

      if (filters.sort === "rent_asc") {
        constraints.push(orderBy("monthlyRent", "asc"));
      } else if (filters.sort === "rent_desc") {
        constraints.push(orderBy("monthlyRent", "desc"));
      } else {
        constraints.push(orderBy("createdAt", "desc"));
      }

      constraints.push(limit(PAGE_SIZE + 1));

      const listingsQuery =
        mode === "more" && lastDocRef.current
          ? query(
              collection(db, "listings").withConverter(converter<Listing>()),
              ...constraints,
              startAfter(lastDocRef.current)
            )
          : query(collection(db, "listings").withConverter(converter<Listing>()), ...constraints);

      const snapshot = await getDocs(listingsQuery);
      const docs = snapshot.docs.slice(0, PAGE_SIZE);
      const search = debouncedSearch.trim().toLowerCase();
      const nextListings = docs
        .map((docSnapshot) => normalizeListing(docSnapshot.data(), docSnapshot.id))
        .filter((listing) => {
          const minRent = Number(filters.minRent || 0);
          const maxRent = Number(filters.maxRent || 0);
          const matchesSearch =
            !search ||
            [listing.title, listing.description, listing.city, listing.district, listing.address]
              .filter(Boolean)
              .some((value) => value?.toLowerCase().includes(search));
          const matchesMin = !minRent || listing.monthlyRent >= minRent;
          const matchesMax = !maxRent || listing.monthlyRent <= maxRent;
          return matchesSearch && matchesMin && matchesMax;
        });

      lastDocRef.current = docs[docs.length - 1] ?? lastDocRef.current;
      setHasMore(snapshot.docs.length > PAGE_SIZE);
      setListings((current) => (mode === "more" ? [...current, ...nextListings] : nextListings));
    } catch (loadError) {
      console.error("Load listings failed", loadError);
      setError("Could not load listings. Check Firebase configuration and permissions.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch, filters.city, filters.listingType, filters.maxRent, filters.minRent, filters.sort]);

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
