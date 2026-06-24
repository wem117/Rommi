"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { CITIES } from "@/lib/constants/cities";
import type { ListingFilters } from "@/hooks/use-listings";

export function ListingFiltersBar({
  filters,
  onChange,
  count
}: {
  filters: ListingFilters;
  onChange: (filters: ListingFilters) => void;
  count: number;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <section className="rounded-[1.75rem] border border-[#ebe0d2] bg-[#f7f1e7] p-4 shadow-soft sm:p-5">
      <div className="flex flex-col gap-3 md:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <input
            value={filters.search ?? ""}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="Search by location, university, or keywords..."
            className="border-[#eadfce] bg-white pl-10"
          />
        </label>

        <button
          type="button"
          onClick={() => setShowAdvanced((current) => !current)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-5 py-3.5 text-sm font-medium text-foreground/80 transition hover:bg-[#f3ecdf]"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-foreground/55">
          <span className="font-semibold text-foreground">{count}</span> listings found
        </p>
        <button
          type="button"
          onClick={() =>
            onChange({
              search: "",
              city: "",
              listingType: "",
              maxRent: "",
              sort: "newest"
            })
          }
          className="text-xs font-semibold uppercase tracking-[0.14em] text-primary transition hover:text-primary/80"
        >
          Reset
        </button>
      </div>

      {showAdvanced ? (
        <div className="mt-4 grid gap-3 border-t border-[#eadfce] pt-4 md:grid-cols-4">
          <select value={filters.city ?? ""} onChange={(event) => onChange({ ...filters, city: event.target.value })}>
            <option value="">All cities</option>
            {CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <select
            value={filters.listingType ?? ""}
            onChange={(event) =>
              onChange({ ...filters, listingType: event.target.value as ListingFilters["listingType"] })
            }
          >
            <option value="">All types</option>
            <option value="private_room">Private room</option>
            <option value="shared_room">Shared room</option>
            <option value="entire_place">Entire place</option>
          </select>
          <input
            type="number"
            min={0}
            placeholder="Max rent"
            value={filters.maxRent ?? ""}
            onChange={(event) =>
              onChange({ ...filters, maxRent: event.target.value ? Number(event.target.value) : "" })
            }
          />
          <select
            value={filters.sort ?? "newest"}
            onChange={(event) => onChange({ ...filters, sort: event.target.value as ListingFilters["sort"] })}
          >
            <option value="newest">Newest</option>
            <option value="rent_asc">Rent low</option>
            <option value="rent_desc">Rent high</option>
          </select>
        </div>
      ) : null}
    </section>
  );
}
