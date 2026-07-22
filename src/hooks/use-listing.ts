"use client";

import { useEffect, useState } from "react";

import { getListingById } from "@/lib/data/listings";
import { friendlySupabaseError } from "@/lib/utils/errors";
import { type AsyncStatus, withRetry } from "@/lib/utils/retry";
import type { Listing } from "@/types/listing";

export function useListing(listingId?: string, initialListing?: Listing | null) {
  const [listing, setListing] = useState<Listing | null>(initialListing ?? null);
  // When the server already provided this listing (SSR), start resolved — no
  // client-fetch waterfall and no loading flash.
  const [loading, setLoading] = useState(Boolean(listingId) && !initialListing);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AsyncStatus>(initialListing ? "success" : "idle");

  useEffect(() => {
    let cancelled = false;

    // Server-provided data for this exact id is authoritative; skip the refetch.
    if (initialListing && initialListing.id === listingId) {
      return;
    }

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
  }, [listingId, initialListing]);

  return { listing, data: listing, loading, error, status };
}
