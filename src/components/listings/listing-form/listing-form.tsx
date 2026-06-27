"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { PhotoUploader } from "@/components/listings/photo-uploader";
import { useAuth } from "@/context/auth-context";
import { CITIES } from "@/lib/constants/cities";
import { listingSchema, type ListingInput } from "@/lib/validations/listing.schema";
import type { Listing } from "@/types/listing";

type ListingFormValues = z.input<typeof listingSchema>;

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
    monthlyRent: listing.monthlyRent,
    depositRequired: listing.depositRequired,
    depositAmount: listing.depositAmount,
    city: listing.city,
    district: listing.district ?? "",
    address: listing.address,
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
          <label htmlFor="title">Title</label>
          <input id="title" {...register("title")} />
          {errors.title ? <p className="mt-1 text-xs text-red-600">{errors.title.message}</p> : null}
        </div>

        <div className="md:col-span-2">
          <label htmlFor="description">Description</label>
          <textarea id="description" rows={5} {...register("description")} />
          {errors.description ? <p className="mt-1 text-xs text-red-600">{errors.description.message}</p> : null}
        </div>

        <div>
          <label htmlFor="propertyType">Property type</label>
          <select id="propertyType" {...register("propertyType")}>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="dorm">Dorm</option>
            <option value="studio">Studio</option>
          </select>
        </div>

        <div>
          <label htmlFor="listingType">Listing type</label>
          <select id="listingType" {...register("listingType")}>
            <option value="private_room">Private room</option>
            <option value="shared_room">Shared room</option>
            <option value="entire_place">Entire place</option>
          </select>
        </div>

        <div>
          <label htmlFor="monthlyRent">Monthly rent (₸)</label>
          <input
            id="monthlyRent"
            type="number"
            min={1}
            step={1000}
            {...register("monthlyRent", { valueAsNumber: true })}
          />
          {errors.monthlyRent ? <p className="mt-1 text-xs text-red-600">{errors.monthlyRent.message}</p> : null}
        </div>

        <div className="rounded-[1.5rem] border border-[#e8dccd] bg-[#f8f2e8] p-4">
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-semibold text-foreground">Deposit required?</span>
              <span className="mt-1 block text-xs text-foreground/55">
                Turn this on if tenants must pay a deposit upfront.
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
            <label htmlFor="depositAmount">Deposit amount (₸)</label>
            <input
              id="depositAmount"
              type="number"
              min={0}
              step={1000}
              {...register("depositAmount", { valueAsNumber: true })}
            />
            {errors.depositAmount ? (
              <p className="mt-1 text-xs text-red-600">{errors.depositAmount.message}</p>
            ) : null}
          </div>
        ) : null}

        <div>
          <label htmlFor="availableFrom">Available from</label>
          <input id="availableFrom" type="date" {...register("availableFrom")} />
          {errors.availableFrom ? <p className="mt-1 text-xs text-red-600">{errors.availableFrom.message}</p> : null}
        </div>

        <div>
          <label htmlFor="city">City</label>
          <select id="city" {...register("city")}>
            <option value="">Select city</option>
            {CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          {errors.city ? <p className="mt-1 text-xs text-red-600">{errors.city.message}</p> : null}
        </div>

        <div>
          <label htmlFor="district">District</label>
          <input id="district" {...register("district")} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="address">Full address</label>
          <input id="address" {...register("address")} />
          {errors.address ? <p className="mt-1 text-xs text-red-600">{errors.address.message}</p> : null}
        </div>

        <div>
          <label htmlFor="bedrooms">Bedrooms</label>
          <input id="bedrooms" type="number" min={0} {...register("bedrooms", { valueAsNumber: true })} />
          {errors.bedrooms ? <p className="mt-1 text-xs text-red-600">{errors.bedrooms.message}</p> : null}
        </div>

        <div>
          <label htmlFor="bathrooms">Bathrooms</label>
          <input id="bathrooms" type="number" min={0} step={0.5} {...register("bathrooms", { valueAsNumber: true })} />
          {errors.bathrooms ? <p className="mt-1 text-xs text-red-600">{errors.bathrooms.message}</p> : null}
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Amenities</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {amenities.map((amenity) => (
            <label key={amenity} className="flex items-center gap-2 rounded-2xl border border-border bg-white px-3 py-2">
              <input type="checkbox" value={amenity} {...register("amenities")} className="h-4 w-4 rounded" />
              <span>{amenity}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="genderPreference">Gender preference</label>
          <select id="genderPreference" {...register("genderPreference")}>
            <option value="any">Any</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label htmlFor="smoking">Smoking</label>
          <select id="smoking" {...register("smoking")}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
        <div>
          <label htmlFor="pets">Pets</label>
          <select id="pets" {...register("pets")}>
            <option value="no_pets">No pets</option>
            <option value="allowed">Allowed</option>
          </select>
        </div>
      </div>

      <div>
        {user ? (
          <PhotoUploader ownerId={user.uid} value={photoUrls} onChange={(urls) => setValue("photoUrls", urls)} />
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
            Delete Listing
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
