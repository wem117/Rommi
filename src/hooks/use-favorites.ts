"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { toggleFavoriteListing } from "@/lib/data/profiles";

export function useFavorites() {
  const { user, profile } = useAuth();
  const favoriteListingIds = useMemo(() => profile?.favoriteListingIds ?? [], [profile]);

  const isFavorite = useCallback(
    (listingId: string) => favoriteListingIds.includes(listingId),
    [favoriteListingIds]
  );

  const toggleFavorite = useCallback(
    async (listingId: string) => {
      if (!user) {
        toast.error("Please sign in to save listings");
        return;
      }

      await toggleFavoriteListing(user.uid, listingId, isFavorite(listingId));
    },
    [isFavorite, user]
  );

  return { favoriteListingIds, isFavorite, toggleFavorite };
}
