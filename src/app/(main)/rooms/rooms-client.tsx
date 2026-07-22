"use client";

import { ArrowRight, List, Loader2, Map as MapIcon, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { ListingFiltersBar } from "@/components/listings/listing-filters";
import { ListingGrid } from "@/components/listings/listing-grid";
import { LazyMap, type MapMarker } from "@/components/map/lazy-map";
import { useLocale } from "@/context/locale-context";
import { formatCurrency } from "@/lib/utils/format";
import { type ListingFilters, useListings } from "@/hooks/use-listings";
import type { Listing } from "@/types/listing";

const FILTERS_STORAGE_KEY = "roomi:rooms:filters";
const URL_FILTER_KEYS = ["university", "city", "listingType", "propertyType", "maxRent", "minRent", "search"];

type InitialData = { listings: Listing[]; hasMore: boolean };

function buildInitialFilters(searchParams: URLSearchParams): ListingFilters {
  const university = searchParams.get("university");
  const city = searchParams.get("city");

  return {
    sort: "newest",
    city: !university && city ? city : undefined,
    university: university || undefined,
    listingType: (searchParams.get("listingType") as ListingFilters["listingType"]) || "",
    maxRent: searchParams.get("maxRent") ? Number(searchParams.get("maxRent")) : "",
    search: searchParams.get("search") ?? ""
  };
}

function RoomsPageContent({ initial }: { initial: InitialData }) {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ListingFilters>(() => buildInitialFilters(searchParams));
  const restoredRef = useRef(false);
  const [view, setView] = useState<"list" | "map">("list");
  const { t } = useLocale();
  const { listings, loading, loadingMore, error, hasMore, reload, loadMore } = useListings(filters, initial);

  const mapMarkers = useMemo<MapMarker[]>(
    () =>
      listings
        .filter((listing) => listing.lat != null && listing.lng != null)
        .map((listing) => ({
          id: listing.id,
          lat: listing.lat as number,
          lng: listing.lng as number,
          title: listing.title,
          price: formatCurrency(listing.monthlyRent),
          district: listing.district,
          university: listing.university,
          photo: listing.photoUrls[0],
          href: `/rooms/${listing.id}`
        })),
    [listings]
  );

  // Restore the last-used filters when the user opens /rooms with no explicit
  // search params (arriving via nav rather than a homepage search). URL params
  // always win. Runs once, after mount, to avoid any SSR/hydration mismatch.
  useEffect(() => {
    const hasUrlParams = URL_FILTER_KEYS.some((key) => searchParams.get(key));
    if (!hasUrlParams) {
      try {
        const saved = window.localStorage.getItem(FILTERS_STORAGE_KEY);
        if (saved) setFilters((current) => ({ ...current, ...(JSON.parse(saved) as ListingFilters) }));
      } catch {
        // ignore malformed storage
      }
    }
    restoredRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist filters (after the initial restore) so they survive navigation.
  useEffect(() => {
    if (!restoredRef.current) return;
    try {
      window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // ignore quota/serialization errors
    }
  }, [filters]);

  return (
    <main className="min-h-[70vh] bg-[#faf6ef]">
      <section className="border-b border-[#ece1d3] bg-[#fffdf9]">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-[#fde8c9] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#b97716] sm:px-4 sm:py-2">
                {t("rooms.badge")}
              </span>
              <h1 className="mt-3 text-3xl font-bold sm:mt-4 sm:text-5xl">{t("rooms.title")}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/60 sm:mt-3 sm:leading-7 sm:text-base">
                {t("rooms.description")}
              </p>
            </div>

            <Link
              href="/list-a-room/step-1"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 sm:px-6 sm:py-3"
            >
              {t("rooms.listRoom")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 sm:mt-8">
            <ListingFiltersBar filters={filters} onChange={setFilters} count={listings.length} />
          </div>

          <div className="mt-3 flex justify-end sm:mt-4">
            <div className="inline-flex rounded-full border border-[#e6daca] bg-white p-1 text-sm font-semibold">
              <button
                type="button"
                onClick={() => setView("list")}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 transition ${
                  view === "list" ? "bg-primary text-white" : "text-foreground/60 hover:text-foreground"
                }`}
                aria-pressed={view === "list"}
              >
                <List className="h-4 w-4" />
                {t("rooms.listView")}
              </button>
              <button
                type="button"
                onClick={() => setView("map")}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 transition ${
                  view === "map" ? "bg-primary text-white" : "text-foreground/60 hover:text-foreground"
                }`}
                aria-pressed={view === "map"}
              >
                <MapIcon className="h-4 w-4" />
                {t("rooms.mapView")}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-10 lg:px-8">
        {!loading && !error && view === "map" ? (
          mapMarkers.length > 0 ? (
            <div className="h-[70vh] overflow-hidden rounded-[1.75rem] border border-[#ece1d3] shadow-soft">
              <LazyMap markers={mapMarkers} openLabel={t("rooms.openListing")} />
            </div>
          ) : (
            <div className="rounded-[1.75rem] bg-white p-8 text-center shadow-soft">
              <p className="text-sm text-foreground/60">{t("rooms.mapEmpty")}</p>
            </div>
          )
        ) : null}

        {view === "list" && loading ? (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[330px] animate-pulse rounded-[1.75rem] bg-white shadow-soft sm:h-[390px]" />
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-[1.75rem] bg-white p-6 shadow-soft">
            <h2 className="font-heading text-xl font-bold">{t("rooms.unavailableTitle")}</h2>
            <p className="mt-2 text-sm text-foreground/65">{error}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
            >
              <RefreshCcw className="h-4 w-4" />
              {t("rooms.retry")}
            </button>
          </div>
        ) : null}

        {view === "list" && !loading && !error && listings.length === 0 ? (
          <div className="rounded-[1.75rem] bg-white p-8 text-center shadow-soft">
            <h2 className="font-heading text-2xl font-bold">{t("rooms.emptyTitle")}</h2>
            <p className="mt-2 text-sm text-foreground/60">
              {t("rooms.emptyText")}
            </p>
          </div>
        ) : null}

        {view === "list" && !loading && !error && listings.length > 0 ? (
          <>
            <ListingGrid listings={listings} />

            {hasMore ? (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-full border border-[#e6daca] bg-white px-6 py-3 text-sm font-semibold shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t("rooms.loadMore")}
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}

export default function RoomsClient({ initial }: { initial: InitialData }) {
  return (
    <Suspense fallback={null}>
      <RoomsPageContent initial={initial} />
    </Suspense>
  );
}
