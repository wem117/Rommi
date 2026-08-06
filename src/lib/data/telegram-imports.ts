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
  /** null when the post stated none. Never 0 as a stand-in. */
  price: number | null;
  currency: string;
  rooms: number | null;
  propertyType: string | null;
  area: number | null;
  floor: number | null;
  totalFloors: number | null;
  amenities: string[];
  contactPhone: string;
  /** The phone exactly as the post wrote it, beside the normalized form. */
  contactPhoneRaw: string;
  contactTelegram: string;
  contactWhatsapp: string;
  contactWhatsappRaw: string;
  photoUrls: string[];
  lat: number | null;
  lng: number | null;
  /** Residential complex — the address form Kazakhstani renters actually use. */
  zhk: string;
  university: string;
  capacity: number | null;
  depositAmount: number | null;
  depositRequired: boolean | null;
  depositNote: string;
  utilitiesIncluded: boolean | null;
  utilitiesNote: string;
  /**
   * What the post is doing: offering a whole place, offering a share, or
   * LOOKING for one. `seeking` is the one that matters — approving it would
   * publish a student's request as somebody's rental.
   */
  listingKind: "offer" | "shared" | "seeking" | "unknown";
  /**
   * Which KIND of record this becomes. `roommate` is a person looking for a
   * place and publishes as a profile, never as a listing.
   */
  draftKind: "listing" | "roommate" | "unknown";
  /** 0-100, summed from what the parser established. Drives the publish gate. */
  confidence: number;
  /** Why it did not publish itself. Kept after approval, to tune the gate. */
  publishBlockers: string[];
  autoPublishedAt: string | null;
  /** Set when a roommate-search draft was published as a profile. */
  profileUid: string | null;
  genderPreference: "any" | "male" | "female" | null;
  studentOnly: boolean;
  roommateWanted: number | null;
  metro: string;
  parserVersion: string;
  parserOutput: unknown;
  extractionError: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  listingId: string | null;
  createdAt: string;
  updatedAt: string;
  /** The original Telegram message text, joined in for review context. */
  sourceContent: string | null;
  /** Who posted it, exactly as Telegram reports them. */
  sender: {
    telegramId: number | null;
    username: string;
    firstName: string;
    lastName: string;
    displayName: string;
  } | null;
  /** Telegram's own send time, which is not when we received it. */
  messageDate: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): TelegramImport {
  const message = row.telegram_messages ?? null;
  return {
    id: row.id,
    telegramMessageId: row.telegram_message_id,
    status: row.status,
    title: row.title ?? "",
    description: row.description ?? "",
    city: row.city ?? "",
    district: row.district ?? "",
    address: row.address ?? "",
    price: row.price ?? null,
    currency: row.currency ?? "KZT",
    rooms: row.rooms ?? null,
    propertyType: row.property_type ?? null,
    area: row.area ?? null,
    floor: row.floor ?? null,
    totalFloors: row.total_floors ?? null,
    amenities: row.amenities ?? [],
    contactPhone: row.contact_phone ?? "",
    contactPhoneRaw: row.contact_phone_raw ?? "",
    contactTelegram: row.contact_telegram ?? "",
    contactWhatsapp: row.contact_whatsapp ?? "",
    contactWhatsappRaw: row.contact_whatsapp_raw ?? "",
    photoUrls: row.photo_urls ?? [],
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    zhk: row.zhk ?? "",
    university: row.university ?? "",
    capacity: row.capacity ?? null,
    depositAmount: row.deposit_amount ?? null,
    depositRequired: row.deposit_required ?? null,
    depositNote: row.deposit_note ?? "",
    utilitiesIncluded: row.utilities_included ?? null,
    utilitiesNote: row.utilities_note ?? "",
    listingKind: row.listing_kind ?? "unknown",
    draftKind: row.draft_kind ?? "unknown",
    confidence: row.confidence ?? 0,
    publishBlockers: row.publish_blockers ?? [],
    autoPublishedAt: row.auto_published_at ?? null,
    profileUid: row.profile_uid ?? null,
    genderPreference: row.gender_preference ?? null,
    studentOnly: row.student_only ?? false,
    roommateWanted: row.roommate_wanted ?? null,
    metro: row.metro ?? "",
    parserVersion: row.parser_version ?? "",
    parserOutput: row.parser_output ?? null,
    extractionError: row.extraction_error ?? null,
    reviewedBy: row.reviewed_by ?? null,
    reviewedAt: row.reviewed_at ?? null,
    listingId: row.listing_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sourceContent: message?.content ?? null,
    sender: message
      ? {
          telegramId: message.sender_telegram_id ?? null,
          username: message.sender_username ?? "",
          firstName: message.sender_first_name ?? "",
          lastName: message.sender_last_name ?? "",
          displayName: message.sender_display_name ?? ""
        }
      : null,
    messageDate: message?.message_date ?? null
  };
}

/**
 * Only the message columns the review UI actually renders.
 *
 * `telegram_messages.content` can be several kilobytes of post text, and the
 * queue reads every pending row at once — naming the columns keeps the join
 * from dragging back the retry bookkeeping (attempts, last_error,
 * photo_message_ids) that nothing on this page displays.
 */
const MESSAGE_COLUMNS =
  "content,message_date,sender_telegram_id,sender_username,sender_first_name,sender_last_name,sender_display_name";

const SELECT_WITH_MESSAGE = `*, telegram_messages(${MESSAGE_COLUMNS})`;

/**
 * The newest unreviewed imports — the "Telegram Imports" queue.
 * `published`/`rejected` rows are excluded from the default queue view but
 * remain in the table as an audit trail.
 */
export const TELEGRAM_QUEUE_LIMIT = 200;

export async function getPendingTelegramImports(): Promise<TelegramImport[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("telegram_listings")
    .select(SELECT_WITH_MESSAGE)
    .in("status", ["draft", "pending_review"])
    .order("created_at", { ascending: false })
    // Bounded because four busy channels can outrun a reviewer for a while, and
    // each row carries the full post text plus its parser output. The oldest
    // drafts beyond this are still in the table and reappear as the queue is
    // worked down; what must never happen is one page load pulling a thousand
    // multi-kilobyte rows into a browser.
    .limit(TELEGRAM_QUEUE_LIMIT);

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function getTelegramImportById(id: string): Promise<TelegramImport | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("telegram_listings")
    .select(SELECT_WITH_MESSAGE)
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
  zhk: "zhk",
  university: "university",
  capacity: "capacity",
  depositAmount: "deposit_amount",
  depositRequired: "deposit_required",
  utilitiesIncluded: "utilities_included",
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
    .select(SELECT_WITH_MESSAGE)
    .single();

  if (error) throw error;
  return mapRow(data);
}

export interface ReviewOutcome {
  /** Set when the draft became a property listing. */
  listingId?: string;
  /** Set when it became a roommate profile instead. */
  profileUid?: string;
  /** True when the import worker published it with no human involved. */
  automatic?: boolean;
}

export async function markTelegramImportReviewed(
  id: string,
  status: "published" | "rejected",
  reviewerUid: string,
  outcome: ReviewOutcome = {}
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("telegram_listings")
    .update({
      status,
      reviewed_by: reviewerUid,
      reviewed_at: now,
      listing_id: outcome.listingId ?? null,
      profile_uid: outcome.profileUid ?? null,
      // NULL means a person did it. The distinction is the whole audit trail
      // for automatic publishing.
      auto_published_at: outcome.automatic ? now : null,
      updated_at: now
    })
    .eq("id", id);

  if (error) throw error;
}
