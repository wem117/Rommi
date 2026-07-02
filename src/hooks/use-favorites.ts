"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import {
  toggleFavoriteListing as persistFavoriteListing,
  toggleFavoriteRoommate as persistFavoriteRoommate
} from "@/lib/data/profiles";

export function useFavorites() {
  const { user, profile, refreshProfile } = useAuth();
  const favoriteListingIds = useMemo(() => profile?.favoriteListingIds ?? [], [profile]);
  const favoriteRoommateIds = useMemo(() => profile?.favoriteRoommateIds ?? [], [profile]);

  const isFavorite = useCallback(
    (listingId: string) => favoriteListingIds.includes(listingId),
    [favoriteListingIds]
  );

  const isRoommateFavorite = useCallback(
    (roommateId: string) => favoriteRoommateIds.includes(roommateId),
    [favoriteRoommateIds]
  );

  const toggleFavorite = useCallback(
    async (listingId: string) => {
      if (!user) {
        toast.error("Please sign in to save listings");
        return;
      }

      await persistFavoriteListing(user.uid, listingId, isFavorite(listingId));
      await refreshProfile();
    },
    [isFavorite, refreshProfile, user]
  );

  const toggleFavoriteRoommate = useCallback(
    async (roommateId: string) => {
      if (!user) {
        toast.error("Please sign in to save roommates");
        return;
      }

      await persistFavoriteRoommate(user.uid, roommateId, isRoommateFavorite(roommateId));
      await refreshProfile();
    },
    [isRoommateFavorite, refreshProfile, user]
  );

  return {
    favoriteListingIds,
    favoriteRoommateIds,
    isFavorite,
    isRoommateFavorite,
    toggleFavorite,
    toggleFavoriteRoommate
  };
}
