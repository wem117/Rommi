"use client";

import { useEffect, useState } from "react";

import { getListingById } from "@/lib/data/listings";
import { friendlySupabaseError } from "@/lib/utils/errors";
import { type AsyncStatus, withRetry } from "@/lib/utils/retry";
import type { Listing } from "@/types/listing";

export function useListing(listingId?: string) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(Boolean(listingId));
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AsyncStatus>("idle");

  useEffect(() => {
    let cancelled = false;

    async function loadListing() {
      if (!listingId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setStatus("loading");

      try {
        const nextListing = await withRetry(() => getListingById(listingId), {
          onRetry: () => setStatus("retrying")
        });
        if (!cancelled) setListing(nextListing);
        if (!cancelled) setStatus("success");
      } catch (loadError) {
        console.error("Load listing failed", loadError);
        if (!cancelled) {
          setError(friendlySupabaseError(loadError, "Could not load this listing."));
          setStatus("error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadListing();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  return { listing, data: listing, loading, error, status };
}
