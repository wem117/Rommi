"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { useLocale } from "@/context/locale-context";
import { UniversityCombobox } from "@/components/shared/university-combobox";
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
  const { t } = useLocale();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <section className="rounded-[1.75rem] border border-[#ebe0d2] bg-[#f7f1e7] p-4 shadow-soft sm:p-5">
      <div className="flex flex-col gap-3 md:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">{t("listingFilters.search")}</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <input
            value={filters.search ?? ""}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder={t("listingFilters.searchPlaceholder")}
            className="border-[#eadfce] bg-white pl-10"
          />
        </label>

        <button
          type="button"
          onClick={() => setShowAdvanced((current) => !current)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-5 py-3.5 text-sm font-medium text-foreground/80 transition hover:bg-[#f3ecdf]"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t("listingFilters.filters")}
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-foreground/55">
          <span className="font-semibold text-foreground">{count}</span> {t("listingFilters.found")}
        </p>
        <button
          type="button"
          onClick={() =>
            onChange({
              search: "",
              city: "",
              university: "",
              listingType: "",
              propertyType: "",
              minRent: "",
              maxRent: "",
              genderPreference: "",
              smoking: "",
              pets: "",
              sort: "newest"
            })
          }
          className="text-xs font-semibold uppercase tracking-[0.14em] text-primary transition hover:text-primary/80"
        >
          {t("listingFilters.reset")}
        </button>
      </div>

      {showAdvanced ? (
        <div className="mt-4 grid gap-3 border-t border-[#eadfce] pt-4 md:grid-cols-4">
          <select value={filters.city ?? ""} onChange={(event) => onChange({ ...filters, city: event.target.value, university: "" })}>
            <option value="">{t("listingFilters.allCities")}</option>
            {CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <UniversityCombobox
            value={filters.university ?? ""}
            onChange={(value) => onChange({ ...filters, university: value, city: value ? "" : filters.city })}
            placeholder="Filter by university"
          />
          <select
            value={filters.listingType ?? ""}
            onChange={(event) =>
              onChange({ ...filters, listingType: event.target.value as ListingFilters["listingType"] })
            }
          >
            <option value="">{t("listingFilters.allTypes")}</option>
            <option value="private_room">{t("listing.types.privateRoom")}</option>
            <option value="shared_room">{t("listing.types.sharedRoom")}</option>
            <option value="entire_place">{t("listing.types.entirePlace")}</option>
          </select>
          <select
            value={filters.propertyType ?? ""}
            onChange={(event) =>
              onChange({ ...filters, propertyType: event.target.value as ListingFilters["propertyType"] })
            }
          >
            <option value="">All property types</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="dorm">Dorm</option>
            <option value="studio">Studio</option>
          </select>
          <input
            type="number"
            min={0}
            placeholder="Min rent"
            value={filters.minRent ?? ""}
            onChange={(event) =>
              onChange({ ...filters, minRent: event.target.value ? Number(event.target.value) : "" })
            }
          />
          <input
            type="number"
            min={0}
            placeholder={t("listingFilters.maxRent")}
            value={filters.maxRent ?? ""}
            onChange={(event) =>
              onChange({ ...filters, maxRent: event.target.value ? Number(event.target.value) : "" })
            }
          />
          <select
            value={filters.genderPreference ?? ""}
            onChange={(event) =>
              onChange({ ...filters, genderPreference: event.target.value as ListingFilters["genderPreference"] })
            }
          >
            <option value="">Any gender preference</option>
            <option value="any">No preference</option>
            <option value="male">Male only</option>
            <option value="female">Female only</option>
          </select>
          <select
            value={filters.smoking ?? ""}
            onChange={(event) => onChange({ ...filters, smoking: event.target.value as ListingFilters["smoking"] })}
          >
            <option value="">Smoking: any</option>
            <option value="no">No smoking</option>
            <option value="yes">Smoking allowed</option>
          </select>
          <select
            value={filters.pets ?? ""}
            onChange={(event) => onChange({ ...filters, pets: event.target.value as ListingFilters["pets"] })}
          >
            <option value="">Pets: any</option>
            <option value="no_pets">No pets</option>
            <option value="allowed">Pets allowed</option>
          </select>
          <select
            value={filters.sort ?? "newest"}
            onChange={(event) => onChange({ ...filters, sort: event.target.value as ListingFilters["sort"] })}
          >
            <option value="newest">{t("listingFilters.newest")}</option>
            <option value="rent_asc">{t("listingFilters.rentLow")}</option>
            <option value="rent_desc">{t("listingFilters.rentHigh")}</option>
          </select>
        </div>
      ) : null}
    </section>
  );
}
