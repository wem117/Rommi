"use client";

import { Search } from "lucide-react";

import { CITIES } from "@/lib/constants/cities";
import type { ListingFilters } from "@/hooks/use-listings";

export function ListingFiltersBar({
  filters,
  onChange
}: {
  filters: ListingFilters;
  onChange: (filters: ListingFilters) => void;
}) {
  return (
    <div className="mt-6 grid gap-3 rounded-2xl bg-white p-4 shadow-soft md:grid-cols-[1.4fr_1fr_1fr_0.8fr_0.8fr]">
      <label className="relative">
        <span className="sr-only">Search</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
        <input
          value={filters.search ?? ""}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Search rooms"
          className="pl-10"
        />
      </label>
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
        onChange={(event) => onChange({ ...filters, maxRent: event.target.value ? Number(event.target.value) : "" })}
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
  );
}
