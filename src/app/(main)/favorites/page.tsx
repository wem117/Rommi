"use client";

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
      <h1 className="text-4xl font-bold">{t("favorites.title")}</h1>
      <p className="mt-2 text-foreground/65">{t("favorites.subtitle")}</p>

      {loading ? <div className="mt-8 rounded-2xl bg-white p-8 shadow-soft">{t("favorites.loading")}</div> : null}
      {error ? <div className="mt-8 rounded-2xl bg-white p-8 shadow-soft">{error}</div> : null}
      {!loading && !error && favorites.length ? (
        <div className="mt-8">
          <ListingGrid listings={favorites} />
        </div>
      ) : null}
      {!loading && !error && !favorites.length ? (
        <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow-soft">
          <h2 className="text-2xl font-bold">{t("profile.emptyRoomsTitle")}</h2>
          <p className="mt-2 text-sm text-foreground/60">{t("profile.emptyRoomsText")}</p>
        </div>
      ) : null}
    </main>
  );
}
