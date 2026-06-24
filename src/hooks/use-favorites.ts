"use client";

import { arrayRemove, arrayUnion, doc, updateDoc } from "firebase/firestore";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";

export function useFavorites() {
  const { user, profile } = useAuth();
  const favoriteListingIds = useMemo(
    () => ((profile as unknown as { favoriteListingIds?: string[] } | null)?.favoriteListingIds ?? []),
    [profile]
  );

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

      const { db } = await import("@/lib/firebase/client");
      await updateDoc(doc(db, "users", user.uid), {
        favoriteListingIds: isFavorite(listingId) ? arrayRemove(listingId) : arrayUnion(listingId)
      });
    },
    [isFavorite, user]
  );

  return { favoriteListingIds, isFavorite, toggleFavorite };
}
