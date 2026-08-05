import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { TelegramImportUpdateInput } from "@/lib/validations/telegram-import.schema";

export type TelegramImportStatus = "draft" | "pending_review" | "published" | "rejected";

export interface TelegramImport {
  id: string;
  telegramMessageId: string | null;
  status: TelegramImportStatus;
  title: string;
  description: string;
  city: string;
  district: string;
  address: string;
  price: number;
  currency: string;
  rooms: number | null;
  propertyType: string | null;
  area: number | null;
  floor: number | null;
  totalFloors: number | null;
  amenities: string[];
  contactPhone: string;
  contactTelegram: string;
  contactWhatsapp: string;
  photoUrls: string[];
  lat: number | null;
  lng: number | null;
  rawAiOutput: unknown;
  extractionError: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  listingId: string | null;
  createdAt: string;
  updatedAt: string;
  /** The original Telegram message text, joined in for review context. */
  sourceContent: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): TelegramImport {
  return {
    id: row.id,
    telegramMessageId: row.telegram_message_id,
    status: row.status,
    title: row.title ?? "",
    description: row.description ?? "",
    city: row.city ?? "",
    district: row.district ?? "",
    address: row.address ?? "",
    price: row.price ?? 0,
    currency: row.currency ?? "KZT",
    rooms: row.rooms ?? null,
    propertyType: row.property_type ?? null,
    area: row.area ?? null,
    floor: row.floor ?? null,
    totalFloors: row.total_floors ?? null,
    amenities: row.amenities ?? [],
    contactPhone: row.contact_phone ?? "",
    contactTelegram: row.contact_telegram ?? "",
    contactWhatsapp: row.contact_whatsapp ?? "",
    photoUrls: row.photo_urls ?? [],
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    rawAiOutput: row.raw_ai_output ?? null,
    extractionError: row.extraction_error ?? null,
    reviewedBy: row.reviewed_by ?? null,
    reviewedAt: row.reviewed_at ?? null,
    listingId: row.listing_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sourceContent: row.telegram_messages?.content ?? null
  };
}

/**
 * Every non-terminal import, newest first — the "Telegram Imports" queue.
 * `published`/`rejected` rows are excluded from the default queue view but
 * remain in the table as an audit trail.
 */
export async function getPendingTelegramImports(): Promise<TelegramImport[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("telegram_listings")
    .select("*, telegram_messages(content)")
    .in("status", ["draft", "pending_review"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function getTelegramImportById(id: string): Promise<TelegramImport | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("telegram_listings")
    .select("*, telegram_messages(content)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data) : null;
}

const FIELD_MAP: Record<keyof TelegramImportUpdateInput, string> = {
  title: "title",
  description: "description",
  city: "city",
  district: "district",
  address: "address",
  price: "price",
  currency: "currency",
  rooms: "rooms",
  propertyType: "property_type",
  area: "area",
  floor: "floor",
  totalFloors: "total_floors",
  amenities: "amenities",
  contactPhone: "contact_phone",
  contactTelegram: "contact_telegram",
  contactWhatsapp: "contact_whatsapp",
  photoUrls: "photo_urls",
  lat: "lat",
  lng: "lng",
  status: "status"
};

export async function updateTelegramImport(id: string, input: TelegramImportUpdateInput): Promise<TelegramImport> {
  const supabase = createSupabaseAdminClient();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

  for (const [key, column] of Object.entries(FIELD_MAP) as [keyof TelegramImportUpdateInput, string][]) {
    if (input[key] !== undefined) payload[column] = input[key];
  }

  const { data, error } = await supabase
    .from("telegram_listings")
    .update(payload)
    .eq("id", id)
    .select("*, telegram_messages(content)")
    .single();

  if (error) throw error;
  return mapRow(data);
}

export async function markTelegramImportReviewed(
  id: string,
  status: "published" | "rejected",
  reviewerUid: string,
  listingId?: string
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("telegram_listings")
    .update({
      status,
      reviewed_by: reviewerUid,
      reviewed_at: new Date().toISOString(),
      listing_id: listingId ?? null,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) throw error;
}
