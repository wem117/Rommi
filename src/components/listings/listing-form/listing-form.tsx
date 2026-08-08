"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { LocationPicker } from "@/components/map/location-picker";
import { PhotoUploader } from "@/components/listings/photo-uploader";
import { UniversityCombobox } from "@/components/shared/university-combobox";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { CITIES } from "@/lib/constants/cities";
import { FALLBACK_PROPERTY_CATEGORIES, getActivePropertyCategories, type PropertyCategory } from "@/lib/data/categories";
import { listingSchema, type ListingInput } from "@/lib/validations/listing.schema";
import type { Listing } from "@/types/listing";

type ListingFormValues = z.input<typeof listingSchema>;

const PROPERTY_TYPE_LABEL_KEYS: Record<string, string> = {
  apartment: "listing.types.apartment",
  house: "listing.types.house",
  dorm: "listing.types.dorm",
  studio: "listing.types.studio"
};

const amenities = [
  "WiFi",
  "Parking",
  "AC",
  "Kitchen",
  "Washing Machine",
  "Gym",
  "Security",
  "Furnished",
  "Balcony",
  "Hot Water"
];

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function listingToInput(listing: Listing): ListingInput {
  return {
    title: listing.title,
    description: listing.description,
    propertyType: listing.propertyType,
    listingType: listing.listingType,
    // The form field is a number input; an unset price shows as empty (0) and
    // is written back as null by the submit mapping.
    monthlyRent: listing.monthlyRent ?? 0,
    depositRequired: listing.depositRequired,
    depositAmount: listing.depositAmount,
    city: listing.city,
    district: listing.district ?? "",
    address: listing.address,
    university: listing.university ?? "",
    lat: listing.lat,
    lng: listing.lng,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    availableFrom: dateInputValue(listing.availableFrom),
    amenities: listing.amenities,
    genderPreference: listing.preferences.genderPreference,
    smoking: listing.preferences.smoking,
    pets: listing.preferences.pets,
    photoUrls: listing.photoUrls
  };
}

/**
 * Marks a field the form will refuse to submit without.
 *
 * The asterisk is aria-hidden and paired with visually-hidden text: a lone "*"
 * is announced as "star" or skipped entirely, which tells a screen-reader user
 * nothing about why their submission was rejected.
 */
function Required() {
  return (
    <>
      <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
      <span className="sr-only"> (required)</span>
    </>
  );
}

export function ListingForm({
  initialListing,
  submitLabel,
  onSubmit,
  onDelete
}: {
  initialListing?: Listing;
  submitLabel: string;
  onSubmit: (values: ListingInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const { user } = useAuth();
  const { t } = useLocale();
  const [propertyCategories, setPropertyCategories] = useState<PropertyCategory[]>(
    FALLBACK_PROPERTY_CATEGORIES.filter((c) => c.slug in PROPERTY_TYPE_LABEL_KEYS)
  );

  useEffect(() => {
    void getActivePropertyCategories().then((categories) =>
      setPropertyCategories(categories.filter((c) => c.slug in PROPERTY_TYPE_LABEL_KEYS))
    );
  }, []);

  const defaultValues = useMemo<ListingFormValues>(
    () =>
      initialListing
        ? listingToInput(initialListing)
        : {
            title: "",
            description: "",
            propertyType: "apartment",
            listingType: "private_room",
            monthlyRent: 150000,
            depositRequired: false,
            depositAmount: 0,
            city: "",
            district: "",
            address: "",
            university: "",
            lat: null,
            lng: null,
            bedrooms: 1,
            bathrooms: 1,
            availableFrom: dateInputValue(new Date()),
            amenities: [],
            genderPreference: "any",
            smoking: "no",
            pets: "no_pets",
            photoUrls: []
          },
    [initialListing]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<ListingFormValues, unknown, ListingInput>({
    resolver: zodResolver(listingSchema),
    defaultValues
  });
  const photoUrls = watch("photoUrls") ?? [];
  const depositRequired = watch("depositRequired");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-2xl bg-white p-6 shadow-soft">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="title">{t("listingForm.title")}</label>
          <input id="title" {...register("title")} />
          {errors.title ? <p className="mt-1 text-xs text-red-600">{errors.title.message}</p> : null}
        </div>

        <div className="md:col-span-2">
          <label htmlFor="description">{t("listingForm.description")}</label>
          <textarea id="description" rows={5} {...register("description")} />
          {errors.description ? <p className="mt-1 text-xs text-red-600">{errors.description.message}</p> : null}
        </div>

        <div>
          <label htmlFor="propertyType">{t("listingForm.propertyType")}</label>
          <select id="propertyType" {...register("propertyType")}>
            {propertyCategories.map((category) => (
              <option key={category.id} value={category.slug}>
                {t(PROPERTY_TYPE_LABEL_KEYS[category.slug]) || category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="listingType">{t("listingForm.listingType")}</label>
          <select id="listingType" {...register("listingType")}>
            <option value="private_room">{t("listing.types.privateRoom")}</option>
            <option value="shared_room">{t("listing.types.sharedRoom")}</option>
            <option value="entire_place">{t("listing.types.entirePlace")}</option>
          </select>
        </div>

        <div>
          <label htmlFor="monthlyRent">{t("listingForm.monthlyRent")}<Required /></label>
          <input
            id="monthlyRent"
            type="text"
            inputMode="numeric"
            pattern="\d*"
            min={1}
            step={1000}
            {...register("monthlyRent", {
              setValueAs: (value) => Number(String(value ?? "").replace(/[^\d]/g, "") || 0)
            })}
          />
          {errors.monthlyRent ? <p className="mt-1 text-xs text-red-600">{errors.monthlyRent.message}</p> : null}
        </div>

        <div className="rounded-[1.5rem] border border-[#e8dccd] bg-[#f8f2e8] p-4">
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-semibold text-foreground">{t("listingForm.depositRequired")}</span>
              <span className="mt-1 block text-xs text-foreground/55">
                {t("listingForm.depositHelp")}
              </span>
            </span>
            <input
              type="checkbox"
              {...register("depositRequired")}
              className="h-5 w-5 rounded border-border accent-primary"
            />
          </label>
        </div>

        {depositRequired ? (
          <div>
            <label htmlFor="depositAmount">{t("listingForm.depositAmount")}</label>
            <input
              id="depositAmount"
              type="text"
              inputMode="numeric"
              pattern="\d*"
              min={0}
              step={1000}
              {...register("depositAmount", {
                setValueAs: (value) => Number(String(value ?? "").replace(/[^\d]/g, "") || 0)
              })}
            />
            {errors.depositAmount ? (
              <p className="mt-1 text-xs text-red-600">{errors.depositAmount.message}</p>
            ) : null}
          </div>
        ) : null}

        <div>
          <label htmlFor="availableFrom">{t("listingForm.availableFrom")}</label>
          <input id="availableFrom" type="date" {...register("availableFrom")} />
          {errors.availableFrom ? <p className="mt-1 text-xs text-red-600">{errors.availableFrom.message}</p> : null}
        </div>

        <div>
          <label htmlFor="city">{t("listingForm.city")}</label>
          <select id="city" {...register("city")}>
            <option value="">{t("listingForm.selectCity")}</option>
            {CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          {errors.city ? <p className="mt-1 text-xs text-red-600">{errors.city.message}</p> : null}
        </div>

        <div>
          <label htmlFor="district">{t("listingForm.district")}</label>
          <input id="district" {...register("district")} />
        </div>

        <div>
          <label htmlFor="university">{t("shared.nearestUniversity")}<Required /></label>
          <UniversityCombobox
            id="university"
            value={watch("university") ?? ""}
            onChange={(value) => setValue("university", value, { shouldValidate: true })}
            placeholder={t("shared.universitySearchPlaceholder")}
          />
          {errors.university ? <p className="mt-1 text-xs text-red-600">{errors.university.message}</p> : null}
        </div>

        <div className="md:col-span-2">
          <LocationPicker
            lat={watch("lat") ?? null}
            lng={watch("lng") ?? null}
            onCoordsChange={(nextLat, nextLng) => {
              setValue("lat", nextLat as number, { shouldValidate: true });
              setValue("lng", nextLng as number, { shouldValidate: true });
            }}
            address={watch("address") ?? ""}
            onAddressChange={(value) => setValue("address", value, { shouldValidate: true })}
            labels={{
              mapLabel: t("listingForm.mapLabel"),
              mapHint: t("listingForm.mapHint"),
              selected: t("listingForm.locationSelected"),
              notSelected: t("listingForm.locationNotSelected"),
              clear: t("listingForm.clearLocation"),
              addressLabel: t("listingForm.addressOptional"),
              addressHint: t("listingForm.addressOptionalHint"),
              addressPlaceholder: t("listingForm.addressPlaceholder")
            }}
          />
          {errors.lat || errors.lng ? (
            <p className="mt-1 text-xs text-red-600">{t("listingForm.locationRequired")}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="bedrooms">{t("listingForm.bedrooms")}</label>
          <input id="bedrooms" type="number" min={0} {...register("bedrooms", { valueAsNumber: true })} />
          {errors.bedrooms ? <p className="mt-1 text-xs text-red-600">{errors.bedrooms.message}</p> : null}
        </div>

        <div>
          <label htmlFor="bathrooms">{t("listingForm.bathrooms")}</label>
          <input id="bathrooms" type="number" min={0} step={0.5} {...register("bathrooms", { valueAsNumber: true })} />
          {errors.bathrooms ? <p className="mt-1 text-xs text-red-600">{errors.bathrooms.message}</p> : null}
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">{t("listingForm.amenities")}</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {amenities.map((amenity) => (
            <label key={amenity} className="flex items-center gap-2 rounded-2xl border border-border bg-white px-3 py-2">
              <input type="checkbox" value={amenity} {...register("amenities")} className="h-4 w-4 rounded" />
              <span>{t(`amenities.${amenity}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="genderPreference">{t("listingForm.genderPreference")}</label>
          <select id="genderPreference" {...register("genderPreference")}>
            <option value="any">{t("listingForm.any")}</option>
            <option value="male">{t("listingForm.male")}</option>
            <option value="female">{t("listingForm.female")}</option>
          </select>
        </div>
        <div>
          <label htmlFor="smoking">{t("listingForm.smoking")}</label>
          <select id="smoking" {...register("smoking")}>
            <option value="no">{t("listingForm.no")}</option>
            <option value="yes">{t("listingForm.yes")}</option>
          </select>
        </div>
        <div>
          <label htmlFor="pets">{t("listingForm.pets")}</label>
          <select id="pets" {...register("pets")}>
            <option value="no_pets">{t("listingForm.noPets")}</option>
            <option value="allowed">{t("listingForm.allowed")}</option>
          </select>
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          {t("listingForm.photos")}
          <Required />
        </span>
        {user ? (
          <PhotoUploader value={photoUrls} onChange={(urls) => setValue("photoUrls", urls)} />
        ) : null}
        {errors.photoUrls ? <p className="mt-1 text-xs text-red-600">{errors.photoUrls.message}</p> : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full border border-red-200 px-5 py-3 text-sm font-semibold text-red-700"
          >
            {t("listingForm.delete")}
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
