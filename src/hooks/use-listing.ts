"use client";

import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

import { converter, timestampToDate } from "@/lib/firebase/firestore";
import type { Listing } from "@/types/listing";

export function normalizeListing(data: Listing, id: string): Listing {
  return {
    ...data,
    id,
    availableFrom: timestampToDate(data.availableFrom) ?? new Date(),
    createdAt: timestampToDate(data.createdAt) ?? new Date(),
    updatedAt: timestampToDate(data.updatedAt) ?? new Date()
  };
}

export function useListing(listingId?: string) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(Boolean(listingId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadListing() {
      if (!listingId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { db } = await import("@/lib/firebase/client");
        const snapshot = await getDoc(doc(db, "listings", listingId).withConverter(converter<Listing>()));
        if (cancelled) return;
        setListing(snapshot.exists() ? normalizeListing(snapshot.data(), snapshot.id) : null);
      } catch (loadError) {
        console.error("Load listing failed", loadError);
        if (!cancelled) setError("Could not load this listing.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadListing();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  return { listing, loading, error };
}
