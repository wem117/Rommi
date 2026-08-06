import type { Listing, ListingPreferences } from "@/types/listing";
import type { Conversation, Message } from "@/types/chat";
import type { Report } from "@/types/report";
import type { LifestylePreferences, UserProfile } from "@/types/user";

type GenericRecord = Record<string, unknown>;

function asDate(value: unknown, fallback = new Date()) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const next = new Date(value);
    if (!Number.isNaN(next.getTime())) return next;
  }
  return fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * A number, or null when there genuinely isn't one.
 *
 * The counterpart to `asNumber` for columns where absence is meaningful.
 * Collapsing those to 0 invents a value the source never gave — for a price
 * that means publishing "0 ₸", which reads as free rather than as unknown.
 */
function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function mapProfileRow(row: GenericRecord): UserProfile {
  const lifestyle = (row.lifestyle as LifestylePreferences | null) ?? {
    smoking: "no",
    pets: "no_pets",
    cleanliness: "moderate",
    sleepSchedule: "balanced",
    guests: "sometimes"
  };

  return {
    uid: String(row.uid ?? row.id ?? ""),
    email: typeof row.email === "string" ? row.email : null,
    fullName: String(row.full_name ?? row.fullName ?? "Roommate user"),
    age: asNumber(row.age, 18),
    gender: (row.gender as UserProfile["gender"]) ?? "prefer_not_to_say",
    university: String(row.university ?? ""),
    city: typeof row.city === "string" ? row.city : "",
    occupation: String(row.occupation ?? ""),
    minBudget: asNumber(row.min_budget ?? row.minBudget, 0),
    maxBudget: asNumber(row.max_budget ?? row.maxBudget, 0),
    preferredMoveInDate: row.preferred_move_in_date || row.preferredMoveInDate ? asDate(row.preferred_move_in_date ?? row.preferredMoveInDate) : null,
    lifestyle,
    onboardingComplete: Boolean(row.onboarding_complete ?? row.onboardingComplete),
    lookingForApartment: Boolean(row.looking_for_apartment ?? row.lookingForApartment ?? true),
    photoURL: typeof row.photo_url === "string" ? row.photo_url : typeof row.photoURL === "string" ? row.photoURL : null,
    bio: typeof row.bio === "string" ? row.bio : "",
    telegram: typeof row.telegram === "string" ? row.telegram : "",
    phone: typeof row.phone === "string" ? row.phone : "",
    contactsHidden: Boolean(row.contacts_hidden ?? row.contactsHidden),
    role: (row.role as UserProfile["role"]) ?? "user",
    verified: Boolean(row.verified),
    banned: Boolean(row.banned),
    bannedAt: row.banned_at || row.bannedAt ? asDate(row.banned_at ?? row.bannedAt) : null,
    suspended: Boolean(row.suspended),
    suspendedAt: row.suspended_at || row.suspendedAt ? asDate(row.suspended_at ?? row.suspendedAt) : null,
    profileCompletion: asNumber(row.profile_completion ?? row.profileCompletion, 0),
    favoriteListingIds: asStringArray(row.favorite_listing_ids ?? row.favoriteListingIds),
    favoriteRoommateIds: asStringArray(row.favorite_roommate_ids ?? row.favoriteRoommateIds),
    viewedListingIds: asStringArray(row.viewed_listing_ids ?? row.viewedListingIds),
    contactedListingIds: asStringArray(row.contacted_listing_ids ?? row.contactedListingIds),
    roommateStatus: (row.roommate_status as UserProfile["roommateStatus"]) ?? "approved",
    featured: Boolean(row.featured),
    featuredPosition: typeof row.featured_position === "number" ? row.featured_position : null,
    createdAt: asDate(row.created_at ?? row.createdAt),
    updatedAt: asDate(row.updated_at ?? row.updatedAt)
  };
}

export function mapListingRow(row: GenericRecord): Listing {
  return {
    id: String(row.id ?? ""),
    ownerId: String(row.owner_id ?? row.ownerId ?? ""),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    propertyType: (row.property_type ?? row.propertyType ?? "apartment") as Listing["propertyType"],
    listingType: (row.listing_type ?? row.listingType ?? "private_room") as Listing["listingType"],
    // Deliberately not asNumber(): that coerces null to 0, which is the exact
    // fabrication this column was made nullable to avoid.
    monthlyRent: nullableNumber(row.monthly_rent ?? row.monthlyRent),
    depositRequired: Boolean(row.deposit_required ?? row.depositRequired),
    depositAmount: asNumber(row.deposit_amount ?? row.depositAmount),
    city: String(row.city ?? ""),
    district: typeof row.district === "string" ? row.district : "",
    address: String(row.address ?? ""),
    university: String(row.university ?? ""),
    lat: typeof row.lat === "number" ? row.lat : row.lat != null && !Number.isNaN(Number(row.lat)) ? Number(row.lat) : null,
    lng: typeof row.lng === "number" ? row.lng : row.lng != null && !Number.isNaN(Number(row.lng)) ? Number(row.lng) : null,
    bedrooms: asNumber(row.bedrooms, 1),
    bathrooms: asNumber(row.bathrooms, 1),
    availableFrom: asDate(row.available_from ?? row.availableFrom),
    amenities: asStringArray(row.amenities),
    preferences: ((row.preferences as ListingPreferences | null) ?? {
      genderPreference: "any",
      smoking: "no",
      pets: "no_pets"
    }) as ListingPreferences,
    photoUrls: asStringArray(row.photo_urls ?? row.photoUrls),
    status: (row.status as Listing["status"]) ?? "approved",
    removed: Boolean(row.removed),
    removedAt: row.removed_at ? asDate(row.removed_at) : null,
    archived: Boolean(row.archived),
    featured: Boolean(row.featured),
    featuredPosition: typeof row.featured_position === "number" ? row.featured_position : null,
    createdAt: asDate(row.created_at ?? row.createdAt),
    updatedAt: asDate(row.updated_at ?? row.updatedAt)
  };
}

export function mapConversationRow(row: GenericRecord): Conversation {
  return {
    id: String(row.id ?? ""),
    participantIds: asStringArray(row.participant_ids ?? row.participantIds),
    listingId: typeof row.listing_id === "string" ? row.listing_id : null,
    listingTitle: typeof row.listing_title === "string" ? row.listing_title : null,
    lastMessage: typeof row.last_message === "string" ? row.last_message : null,
    lastMessageAt: row.last_message_at ? asDate(row.last_message_at) : null,
    createdAt: asDate(row.created_at ?? row.createdAt),
    updatedAt: asDate(row.updated_at ?? row.updatedAt),
    unreadCounts: (row.unread_counts as Record<string, number> | null) ?? null
  };
}

export function mapMessageRow(row: GenericRecord): Message {
  return {
    id: String(row.id ?? ""),
    conversationId: String(row.conversation_id ?? row.conversationId ?? ""),
    senderId: String(row.sender_id ?? row.senderId ?? ""),
    text: String(row.text ?? ""),
    imageUrl: typeof row.image_url === "string" ? row.image_url : null,
    createdAt: asDate(row.created_at ?? row.createdAt),
    readBy: asStringArray(row.read_by ?? row.readBy)
  };
}

export function mapReportRow(row: GenericRecord): Report {
  return {
    id: String(row.id ?? ""),
    reporterId: String(row.reporter_id ?? row.reporterId ?? ""),
    targetId: String(row.target_id ?? row.targetId ?? ""),
    targetType: (row.target_type ?? row.targetType ?? "listing") as Report["targetType"],
    reason: String(row.reason ?? ""),
    details: typeof row.details === "string" ? row.details : "",
    status: (row.status ?? "open") as Report["status"],
    adminNote: typeof row.admin_note === "string" ? row.admin_note : "",
    createdAt: asDate(row.created_at ?? row.createdAt),
    updatedAt: asDate(row.updated_at ?? row.updatedAt)
  };
}
