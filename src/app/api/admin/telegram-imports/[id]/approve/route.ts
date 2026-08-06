import { NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse } from "@/lib/api/error-response";
import { revalidatePublic } from "@/lib/api/revalidate";
import { findPossibleDuplicates, upsertListingAdminMeta } from "@/lib/data/listing-admin-meta";
import { createListing } from "@/lib/data/listings-admin";
import { createTemporaryHost } from "@/lib/data/seeded-hosts";
import { getTelegramImportById, markTelegramImportReviewed, updateTelegramImport } from "@/lib/data/telegram-imports";
import { requireAdminUser } from "@/lib/supabase/admin";
import { telegramImportApproveSchema } from "@/lib/validations/telegram-import.schema";

const REQUIRED_FIELDS_MESSAGE =
  "Title, description, price, and city are required before approving. Edit the import first.";

/**
 * Approves a staged Telegram import: creates a real listing via the SAME
 * pipeline the admin's manual "paste a post" quick-create uses
 * (createTemporaryHost + createListing + findPossibleDuplicates +
 * upsertListingAdminMeta), so a Telegram-sourced listing is indistinguishable
 * from a hand-seeded one. Never writes directly into `listings` from any other
 * path — this is the one and only place a telegram_listings row becomes a
 * real listing.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAdminUser();
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const { lat, lng, university } = telegramImportApproveSchema.parse(body);
    const ignoreDuplicates = z.boolean().optional().default(false).parse(body.ignoreDuplicates);
    const confirmSeeking = z.boolean().optional().default(false).parse(body.confirmSeeking);

    const item = await getTelegramImportById(id);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (item.status === "published" || item.status === "rejected") {
      return NextResponse.json({ error: `This import was already ${item.status}.` }, { status: 409 });
    }

    if (!item.title.trim() || !item.description.trim() || !item.price || !item.city.trim()) {
      return NextResponse.json({ error: REQUIRED_FIELDS_MESSAGE }, { status: 400 });
    }

    // A `seeking` post is a student asking for a room, not one on offer.
    // Publishing it would put their request up as somebody's rental, with a
    // temporary host profile carrying their phone number. The parser flags
    // these; this refuses them unless the admin says, in this request, that
    // they have read the post and disagree.
    if (item.listingKind === "seeking" && !confirmSeeking) {
      return NextResponse.json(
        {
          error:
            "This post looks like someone LOOKING for housing, not offering it. " +
            "Publishing it would list their request as a rental. Re-check the original " +
            "message, then confirm if the parser got it wrong.",
          needsSeekingConfirmation: true
        },
        { status: 409 }
      );
    }

    if (item.currency !== "KZT") {
      return NextResponse.json(
        { error: `Currency ${item.currency} is not supported; edit the price to KZT before approving.` },
        { status: 400 }
      );
    }

    // Persist the final pin/university alongside the rest of the row, so the
    // audit trail (and a later re-open of this import) reflects exactly what
    // was published.
    await updateTelegramImport(id, { lat, lng, status: "pending_review" });

    if (!ignoreDuplicates) {
      const duplicates = await findPossibleDuplicates({ city: item.city, address: item.address });
      if (duplicates.length) {
        return NextResponse.json({ duplicates }, { status: 409 });
      }
    }

    const ownerId = await createTemporaryHost({
      // The poster's own Telegram display name when we have it — a host card
      // reading "Aigerim" is worth more to a renter than one repeating the
      // listing's title back at them.
      displayName: item.sender?.displayName?.trim() || item.title.trim() || "Telegram listing",
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
      // A shared post is a room in an occupied flat; an offer of the whole
      // place is not. Defaulting everything to private_room mislabelled every
      // whole-apartment listing the import produced.
      listingType: item.listingKind === "offer" ? "entire_place" : "private_room",
      monthlyRent: item.price,
      depositRequired: item.depositRequired ?? false,
      depositAmount: item.depositAmount ?? 0,
      city: item.city,
      district: item.district,
      // The complex is the address renters navigate by; fall back to it when
      // the post named no street.
      address: item.address || (item.zhk ? `ЖК ${item.zhk}` : ""),
      university: university || item.university || "",
      lat,
      lng,
      bedrooms: item.rooms ?? 1,
      bathrooms: 1,
      availableFrom: new Date(),
      amenities: item.amenities,
      preferences: { genderPreference: "any", smoking: "no", pets: "no_pets" },
      photoUrls: item.photoUrls
    });

    await upsertListingAdminMeta(listingId, {
      sourceTelegram: item.contactTelegram,
      sourceNote: `Imported via Telegram automation (telegram_listings.id=${item.id})`,
      adminNotes: item.extractionError ?? ""
    });

    await markTelegramImportReviewed(id, "published", user.id, listingId);
    revalidatePublic("listings");

    return NextResponse.json({ ok: true, listingId });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
