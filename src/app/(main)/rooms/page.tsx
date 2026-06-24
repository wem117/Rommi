"use client";

import { Loader2, RefreshCcw } from "lucide-react";

import { ListingCard } from "@/components/listings/listing-card";
import { useListings } from "@/hooks/use-listings";

export default function RoomsPage() {
  const { listings, loading, loadingMore, error, hasMore, reload, loadMore } = useListings();

  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-4xl font-bold">Rooms</h1>
          <p className="mt-2 text-foreground/65">Real listings published by Roommate KZ users.</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-80 animate-pulse rounded-2xl bg-white shadow-soft" />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="mt-10 rounded-2xl bg-white p-6 shadow-soft">
          <h2 className="font-heading text-xl font-bold">Listings unavailable</h2>
          <p className="mt-2 text-sm text-foreground/65">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
          >
            <RefreshCcw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !error && listings.length === 0 ? (
        <div className="mt-10 rounded-2xl bg-white p-8 text-center shadow-soft">
          <h2 className="font-heading text-2xl font-bold">No listings yet</h2>
          <p className="mt-2 text-sm text-foreground/60">Published listings will appear here.</p>
        </div>
      ) : null}

      {!loading && !error && listings.length > 0 ? (
        <>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>

          {hasMore ? (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-6 py-3 text-sm font-semibold shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Load more
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
