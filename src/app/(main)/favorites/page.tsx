"use client";

import { ArrowRight, Heart } from "lucide-react";
import Link from "next/link";

import { ListingGrid } from "@/components/listings/listing-grid";
import { useLocale } from "@/context/locale-context";
import { useFavorites } from "@/hooks/use-favorites";
import { useListings } from "@/hooks/use-listings";

export default function FavoritesPage() {
  const { favoriteListingIds } = useFavorites();
  const { listings, loading, error } = useListings();
  const { t } = useLocale();
  const favorites = listings.filter((listing) => favoriteListingIds.includes(listing.id));

  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold sm:text-4xl">{t("favorites.title")}</h1>
      <p className="mt-2 text-foreground/65">{t("favorites.subtitle")}</p>

      {loading ? <div className="mt-8 rounded-2xl bg-white p-8 shadow-soft">{t("favorites.loading")}</div> : null}
      {error ? <div className="mt-8 rounded-2xl bg-white p-8 shadow-soft">{error}</div> : null}
      {!loading && !error && favorites.length ? (
        <div className="mt-8">
          <ListingGrid listings={favorites} />
        </div>
      ) : null}
      {!loading && !error && !favorites.length ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl bg-white p-10 text-center shadow-soft">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <Heart className="h-6 w-6 text-destructive/60" />
          </span>
          <h2 className="mt-4 text-2xl font-bold">{t("profile.emptyRoomsTitle")}</h2>
          <p className="mt-2 max-w-sm text-sm text-foreground/60">{t("profile.emptyRoomsText")}</p>
          <Link
            href="/rooms"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 hover:shadow-md active:scale-95"
          >
            {t("rooms.title")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </main>
  );
}
