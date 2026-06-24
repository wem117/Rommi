import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { Listing } from "@/types/listing";

function toListingPayload(ownerId: string, input: Partial<Listing>) {
  return {
    owner_id: ownerId,
    title: input.title,
    description: input.description,
    property_type: input.propertyType,
    listing_type: input.listingType,
    monthly_rent: input.monthlyRent,
    city: input.city,
    district: input.district ?? "",
    address: input.address,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    available_from: input.availableFrom?.toISOString(),
    amenities: input.amenities ?? [],
    preferences: input.preferences ?? null,
    photo_urls: input.photoUrls ?? [],
    updated_at: new Date().toISOString()
  };
}

export async function createListing(ownerId: string, input: Partial<Listing>) {
  const supabase = createSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("listings")
    .insert({ ...toListingPayload(ownerId, input) })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function updateListing(listingId: string, ownerId: string, input: Partial<Listing>) {
  const supabase = createSupabaseAdminClient() as any;
  const { error } = await supabase
    .from("listings")
    .update(toListingPayload(ownerId, input))
    .eq("id", listingId)
    .eq("owner_id", ownerId);

  if (error) throw error;
}

export async function deleteListing(listingId: string, ownerId: string) {
  const supabase = createSupabaseAdminClient() as any;
  const { error } = await supabase.from("listings").delete().eq("id", listingId).eq("owner_id", ownerId);
  if (error) throw error;
}
