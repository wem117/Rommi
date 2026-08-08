"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

import { useLocale } from "@/context/locale-context";
import { UniversityCombobox } from "@/components/shared/university-combobox";

import { FALLBACK_PROPERTY_CATEGORIES, getActivePropertyCategories, type PropertyCategory } from "@/lib/data/categories";
import type { ListingFilters } from "@/hooks/use-listings";

const PROPERTY_TYPE_LABEL_KEYS: Record<string, string> = {
  apartment: "listingFilters.apartment",
  house: "listingFilters.house",
  dorm: "listingFilters.dorm",
  studio: "listingFilters.studio"
};

export function ListingFiltersBar({
  filters,
  onChange,
  count,
  inventory
}: {
  filters: ListingFilters;
  onChange: (filters: ListingFilters) => void;
  count: number;
  /**
   * Cities and universities that actually have a live listing right now,
   * computed server-side in one query alongside the page itself. Both
   * dropdowns render from this instead of the full static constant lists —
   * see getListingFilterInventoryServer for why.
   */
  inventory: { cities: string[]; universities: string[] };
}) {
  const { t } = useLocale();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [propertyCategories, setPropertyCategories] = useState<PropertyCategory[]>(
    FALLBACK_PROPERTY_CATEGORIES.filter((c) => c.slug in PROPERTY_TYPE_LABEL_KEYS)
  );

  useEffect(() => {
    void getActivePropertyCategories().then((categories) =>
      setPropertyCategories(categories.filter((c) => c.slug in PROPERTY_TYPE_LABEL_KEYS))
    );
  }, []);

  return (
    <section className="rounded-[1.75rem] border border-[#ebe0d2] bg-[#f7f1e7] p-3 shadow-soft sm:p-5">
      <div className="flex flex-col gap-2.5 sm:gap-3 md:flex-row">
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
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-5 py-2.5 text-sm font-medium text-foreground/80 transition hover:bg-[#f3ecdf] sm:py-3.5"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t("listingFilters.filters")}
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 sm:mt-4">
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
        <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-[#eadfce] pt-3 sm:mt-4 sm:gap-3 sm:pt-4 md:grid-cols-4">
          <select value={filters.city ?? ""} onChange={(event) => onChange({ ...filters, city: event.target.value, university: "" })}>
            <option value="">{t("listingFilters.allCities")}</option>
            {inventory.cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <div className="col-span-2 md:col-span-1">
            <UniversityCombobox
              value={filters.university ?? ""}
              onChange={(value) => onChange({ ...filters, university: value, city: value ? "" : filters.city })}
              placeholder={t("listingFilters.universityPlaceholder")}
              allowedValues={inventory.universities}
            />
          </div>
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
            <option value="">{t("listingFilters.allPropertyTypes")}</option>
            {propertyCategories.map((category) => (
              <option key={category.id} value={category.slug}>
                {t(PROPERTY_TYPE_LABEL_KEYS[category.slug]) || category.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            placeholder={t("listingFilters.minRent")}
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
            <option value="">{t("listingFilters.anyGenderPreference")}</option>
            <option value="any">{t("listingFilters.noPreference")}</option>
            <option value="male">{t("listingFilters.maleOnly")}</option>
            <option value="female">{t("listingFilters.femaleOnly")}</option>
          </select>
          <select
            value={filters.smoking ?? ""}
            onChange={(event) => onChange({ ...filters, smoking: event.target.value as ListingFilters["smoking"] })}
          >
            <option value="">{t("listingFilters.smokingAny")}</option>
            <option value="no">{t("listingFilters.noSmoking")}</option>
            <option value="yes">{t("listingFilters.smokingAllowed")}</option>
          </select>
          <select
            value={filters.pets ?? ""}
            onChange={(event) => onChange({ ...filters, pets: event.target.value as ListingFilters["pets"] })}
          >
            <option value="">{t("listingFilters.petsAny")}</option>
            <option value="no_pets">{t("listingFilters.noPets")}</option>
            <option value="allowed">{t("listingFilters.petsAllowed")}</option>
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
