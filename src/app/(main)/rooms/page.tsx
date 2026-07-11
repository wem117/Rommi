"use client";

import { ArrowRight, Loader2, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { ListingFiltersBar } from "@/components/listings/listing-filters";
import { ListingGrid } from "@/components/listings/listing-grid";
import { useLocale } from "@/context/locale-context";
import { type ListingFilters, useListings } from "@/hooks/use-listings";

const FILTERS_STORAGE_KEY = "roomi:rooms:filters";
const URL_FILTER_KEYS = ["university", "city", "listingType", "propertyType", "maxRent", "minRent", "search"];

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

function RoomsPageContent() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ListingFilters>(() => buildInitialFilters(searchParams));
  const restoredRef = useRef(false);
  const { t } = useLocale();
  const { listings, loading, loadingMore, error, hasMore, reload, loadMore } = useListings(filters);

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
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-[#fde8c9] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#b97716]">
                {t("rooms.badge")}
              </span>
              <h1 className="mt-4 text-4xl font-bold sm:text-5xl">{t("rooms.title")}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground/60 sm:text-base">
                {t("rooms.description")}
              </p>
            </div>

            <Link
              href="/list-a-room/step-1"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              {t("rooms.listRoom")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8">
            <ListingFiltersBar filters={filters} onChange={setFilters} count={listings.length} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[390px] animate-pulse rounded-[1.75rem] bg-white shadow-soft" />
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

        {!loading && !error && listings.length === 0 ? (
          <div className="rounded-[1.75rem] bg-white p-8 text-center shadow-soft">
            <h2 className="font-heading text-2xl font-bold">{t("rooms.emptyTitle")}</h2>
            <p className="mt-2 text-sm text-foreground/60">
              {t("rooms.emptyText")}
            </p>
          </div>
        ) : null}

        {!loading && !error && listings.length > 0 ? (
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

export default function RoomsPage() {
  return (
    <Suspense fallback={null}>
      <RoomsPageContent />
    </Suspense>
  );
}
