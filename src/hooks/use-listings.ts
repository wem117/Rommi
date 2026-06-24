"use client";

import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  type QueryDocumentSnapshot
} from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";

import { converter, timestampToDate } from "@/lib/firebase/firestore";
import type { Listing } from "@/types/listing";

const PAGE_SIZE = 9;

function normalizeListing(data: Listing, id: string): Listing {
  return {
    ...data,
    id,
    availableFrom: timestampToDate(data.availableFrom) ?? new Date(),
    createdAt: timestampToDate(data.createdAt) ?? new Date(),
    updatedAt: timestampToDate(data.updatedAt) ?? new Date()
  };
}

export function useListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const lastDocRef = useRef<QueryDocumentSnapshot<Listing> | null>(null);
  const didLoadRef = useRef(false);

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
      const baseQuery = [
        collection(db, "listings").withConverter(converter<Listing>()),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE + 1)
      ] as const;

      const listingsQuery =
        mode === "more" && lastDocRef.current
          ? query(...baseQuery, startAfter(lastDocRef.current))
          : query(...baseQuery);

      const snapshot = await getDocs(listingsQuery);
      const docs = snapshot.docs.slice(0, PAGE_SIZE);
      const nextListings = docs.map((docSnapshot) => normalizeListing(docSnapshot.data(), docSnapshot.id));

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
  }, []);

  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
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
