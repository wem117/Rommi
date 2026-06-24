"use client";

import { useEffect, useState } from "react";

import { getListingById } from "@/lib/data/listings";
import type { Listing } from "@/types/listing";

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
        const nextListing = await getListingById(listingId);
        if (!cancelled) setListing(nextListing);
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
