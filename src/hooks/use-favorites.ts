"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import {
  toggleFavoriteListing as persistFavoriteListing,
  toggleFavoriteRoommate as persistFavoriteRoommate
} from "@/lib/data/profiles";

export function useFavorites() {
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  // Anonymous visitors can browse freely; the first save attempt sends them
  // to sign-in and returns them to the page they were on afterwards.
  const requireSignIn = useCallback(() => {
    toast.error(t("shared.signInToSave"));
    router.push(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
  }, [pathname, router, t]);
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
        requireSignIn();
        return;
      }

      await persistFavoriteListing(user.uid, listingId, isFavorite(listingId));
      await refreshProfile();
    },
    [isFavorite, refreshProfile, requireSignIn, user]
  );

  const toggleFavoriteRoommate = useCallback(
    async (roommateId: string) => {
      if (!user) {
        requireSignIn();
        return;
      }

      await persistFavoriteRoommate(user.uid, roommateId, isRoommateFavorite(roommateId));
      await refreshProfile();
    },
    [isRoommateFavorite, refreshProfile, requireSignIn, user]
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
