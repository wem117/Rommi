import "server-only";

import { findPossibleDuplicates, upsertListingAdminMeta } from "@/lib/data/listing-admin-meta";
import { createListing } from "@/lib/data/listings-admin";
import { createSeededProfile, createTemporaryHost } from "@/lib/data/seeded-hosts";
import {
  getTelegramImportById,
  markTelegramImportReviewed,
  type TelegramImport
} from "@/lib/data/telegram-imports";

/**
 * Turning a reviewed Telegram draft into a real record.
 *
 * ONE implementation, two callers: the admin panel's Approve button and the
 * import worker's automatic-publish path. They differ only in who authorised
 * it, which is recorded — never in what gets created. That is the whole promise
 * of this feature: an imported listing has to be indistinguishable from a
 * hand-seeded one, and it stops being true the moment there are two code paths
 * that both "create a listing".
 *
 * A draft becomes one of two things, decided by `draftKind` and never inferred
 * here:
 *
 *   listing    a place on offer  -> createTemporaryHost() + createListing()
 *   roommate   a person looking  -> createSeededProfile({ lookingForApartment })
 *
 * Publishing a roommate search as a property listing would put a student's
 * request up as somebody's rental with their phone number attached, so the two
 * branches are kept explicit and the caller cannot ask for the wrong one.
 */

export class TelegramPublishError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly extra: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "TelegramPublishError";
  }
}

export interface PublishOptions {
  /** Recorded as the reviewer. A uid for a person, or a service marker. */
  reviewer: string;
  /** Optional map pin. Absent is fine — location is not required to publish. */
  lat?: number | null;
  lng?: number | null;
  university?: string;
  /** Skip the "already have something at this address" check. */
  ignoreDuplicates?: boolean;
  /** Publish a roommate-search draft as a listing anyway. Human-only. */
  confirmKindOverride?: boolean;
  /** True when the import worker published without a human. */
  automatic?: boolean;
}

export interface PublishResult {
  kind: "listing" | "roommate";
  listingId?: string;
  profileUid?: string;
}

const REQUIRED_FIELDS_MESSAGE =
  "Title, description, and city are required before approving. Edit the import first.";

/** Everything both branches need, checked once so neither can forget. */
function assertPublishable(item: TelegramImport, options: PublishOptions): void {
  if (item.status === "published" || item.status === "rejected") {
    throw new TelegramPublishError(`This import was already ${item.status}.`, 409);
  }

  // Price is deliberately NOT required. A post that states no price is a real
  // listing with an unstated price, and inventing 0 would render as "0 ₸" —
  // a wrong number a student then budgets around.
  if (!item.title.trim() || !item.description.trim() || !item.city.trim()) {
    throw new TelegramPublishError(REQUIRED_FIELDS_MESSAGE, 400);
  }

  if (item.currency !== "KZT") {
    throw new TelegramPublishError(
      `Currency ${item.currency} is not supported; edit the price to KZT before approving.`,
      400
    );
  }

  if (item.draftKind === "roommate" && options.confirmKindOverride) return;
  if (item.draftKind === "unknown" && !options.confirmKindOverride) {
    throw new TelegramPublishError(
      "The parser could not tell whether this post offers housing or asks for it. " +
        "Read the original message and choose, then confirm.",
      409,
      { needsKindConfirmation: true }
    );
  }
}

/**
 * Publishes a draft. Throws TelegramPublishError with an HTTP status the route
 * can return directly.
 */
export async function publishTelegramImport(
  id: string,
  options: PublishOptions
): Promise<PublishResult> {
  const item = await getTelegramImportById(id);
  if (!item) throw new TelegramPublishError("Not found", 404);

  assertPublishable(item, options);

  const kind = item.draftKind === "roommate" && !options.confirmKindOverride ? "roommate" : "listing";
  return kind === "roommate"
    ? publishAsRoommate(id, item, options)
    : publishAsListing(id, item, options);
}

/**
 * A place on offer. Identical to what Admin → Quick create produces: the same
 * temporary-host profile, the same listing insert, the same duplicate check and
 * the same admin-meta trail.
 */
async function publishAsListing(
  id: string,
  item: TelegramImport,
  options: PublishOptions
): Promise<PublishResult> {
  if (!options.ignoreDuplicates) {
    const duplicates = await findPossibleDuplicates({ city: item.city, address: item.address });
    if (duplicates.length) {
      throw new TelegramPublishError("Possible duplicates found", 409, { duplicates });
    }
  }

  const ownerId = await createTemporaryHost({
    displayName: contactDisplayName(item),
    photoURL: "",
    phone: item.contactPhone,
    whatsapp: item.contactWhatsapp,
    telegram: item.contactTelegram,
    instagram: ""
  });

  const listingId = await createListing(ownerId, {
    title: item.title,
    description: item.description,
    propertyType: (item.propertyType as never) || "apartment",
    // A whole place on offer versus a room in an occupied one.
    listingType: item.listingKind === "offer" ? "entire_place" : "private_room",
    // null, not 0. The column is nullable precisely so "not stated" survives.
    monthlyRent: item.price ?? null,
    depositRequired: item.depositRequired ?? false,
    depositAmount: item.depositAmount ?? 0,
    city: item.city,
    district: item.district,
    address: item.address || (item.zhk ? `ЖК ${item.zhk}` : ""),
    university: options.university || item.university || "",
    lat: options.lat ?? item.lat ?? null,
    lng: options.lng ?? item.lng ?? null,
    bedrooms: item.rooms ?? 1,
    bathrooms: 1,
    availableFrom: new Date(),
    amenities: item.amenities,
    preferences: {
      genderPreference: (item.genderPreference as never) ?? "any",
      smoking: "no",
      pets: "no_pets"
    },
    photoUrls: item.photoUrls
  } as never);

  await upsertListingAdminMeta(listingId, {
    sourceTelegram: item.contactTelegram,
    sourceNote: options.automatic
      ? `Imported and published automatically (telegram_listings.id=${item.id}, confidence ${item.confidence})`
      : `Imported via Telegram automation (telegram_listings.id=${item.id})`,
    adminNotes: item.extractionError ?? ""
  });

  await markTelegramImportReviewed(id, "published", options.reviewer, {
    listingId,
    automatic: options.automatic
  });

  return { kind: "listing", listingId };
}

/**
 * A person looking for a place. Becomes a roommate profile in the /roommates
 * directory — NOT a listing.
 *
 * Their stated budget is a maximum, so it lands in `maxBudget` rather than
 * being mistaken for rent. Gender is deliberately left unset: the parser reads
 * who a post is looking FOR, which is not the same as who wrote it, and
 * guessing someone's gender onto their public profile is not a mistake worth
 * risking to save one dropdown.
 */
async function publishAsRoommate(
  id: string,
  item: TelegramImport,
  options: PublishOptions
): Promise<PublishResult> {
  const profileUid = await createSeededProfile({
    fullName: contactDisplayName(item),
    photoURL: "",
    contacts: {
      phone: item.contactPhone,
      whatsapp: item.contactWhatsapp,
      telegram: item.contactTelegram,
      instagram: ""
    },
    bio: item.description,
    university: options.university || item.university || "",
    city: item.city,
    maxBudget: item.price ?? 0,
    lookingForApartment: true
  });

  await markTelegramImportReviewed(id, "published", options.reviewer, {
    profileUid,
    automatic: options.automatic
  });

  return { kind: "roommate", profileUid };
}

/**
 * What to call this person on the published record.
 *
 * Priority is fixed by the spec and is a fallback chain, not a preference: the
 * name Telegram currently shows, then the handle, then the phone, then a
 * neutral placeholder. Never an empty string, because a host card with no name
 * reads as a broken record rather than an anonymous one.
 */
export function contactDisplayName(item: TelegramImport): string {
  const display = item.sender?.displayName?.trim();
  if (display) return display;

  const username = (item.sender?.username || item.contactTelegram).trim();
  if (username) return username.replace(/^@/, "");

  const phone = (item.contactPhone || item.contactWhatsapp).trim();
  if (phone) return phone;

  return "Telegram user";
}
