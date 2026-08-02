"use client";

import { Heart, Mail, Pencil, UserCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ContactLinks } from "@/components/shared/contact-links";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { createConversation } from "@/hooks/use-conversations";
import { useFavorites } from "@/hooks/use-favorites";
import { recordContactedListing } from "@/lib/data/profiles";
import type { Listing } from "@/types/listing";
import type { UserProfile } from "@/types/user";

/**
 * Contact card for a listing's host.
 *
 * The owner is passed in already resolved (fetched on the server alongside the
 * listing) rather than loaded from a `useEffect` here. Previously this card
 * mounted empty and filled in after hydration, which meant the page's PRIMARY
 * call to action — message, phone, Telegram — appeared late and moved the
 * layout when it did. Receiving it as a prop makes the card correct in the
 * first paint and removes that shift entirely.
 *
 * Compact by design: the old card stacked a 64px avatar, a 2xl name, a large
 * message button, a separate email button, contact icons, a large save button
 * and a listed-on row, which pushed the whole right column far past the fold.
 * Everything is still here, at sizes that leave the card readable in one glance
 * while keeping every touch target at least 44px.
 *
 * There is no "response rate": no such field exists on the profile, in the
 * database, or anywhere in this codebase, and inventing a number shown next to
 * a real person's name would be fabricating trust signals.
 */
export function ListingOwnerCard({
  listing,
  owner,
  ownerContacts,
  variant = "sidebar"
}: {
  listing: Listing;
  owner: UserProfile | null;
  ownerContacts?: { whatsapp: string; instagram: string };
  /** `sidebar` sticks on desktop; `inline` is the mobile flow position. */
  variant?: "sidebar" | "inline";
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [messageLoading, setMessageLoading] = useState(false);

  const saved = isFavorite(listing.id);
  const isOwnListing = user?.uid === listing.ownerId;

  async function handleMessage() {
    if (!owner) return;
    if (!user) {
      router.push(`/sign-in?redirect=/rooms/${listing.id}`);
      return;
    }

    setMessageLoading(true);
    try {
      void recordContactedListing(user.uid, listing.id);
      const conversationId = await createConversation({
        participantIds: [user.uid, owner.uid],
        listingId: listing.id,
        listingTitle: listing.title
      });
      router.push(`/inbox/${conversationId}`);
    } finally {
      setMessageLoading(false);
    }
  }

  const memberSince = owner?.createdAt
    ? new Intl.DateTimeFormat(locale === "kz" ? "kk" : locale, { year: "numeric" }).format(owner.createdAt)
    : null;

  return (
    <div
      className={
        variant === "sidebar"
          ? "rounded-2xl border border-border bg-card p-4 shadow-soft sm:rounded-3xl sm:p-5"
          : "rounded-2xl border border-border bg-card p-4 shadow-soft"
      }
    >
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-surface-muted">
          {owner?.photoURL ? (
            <Image src={owner.photoURL} alt={owner.fullName} fill className="object-cover" sizes="48px" />
          ) : (
            <UserCircle className="h-full w-full text-primary/70" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/45">
            {t("listingDetail.currentRoommate")}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="truncate font-heading text-base font-semibold text-foreground sm:text-lg">
              {owner?.fullName ?? t("listingDetail.listingOwnerFallback")}
            </span>
            <VerifiedBadge verified={owner?.verified} />
          </div>
          {memberSince ? (
            <p className="text-xs text-foreground/55">
              {t("listingDetail.memberSince")} {memberSince}
            </p>
          ) : null}
        </div>
      </div>

      {/* Primary action. min-h-11 keeps the tap target >= 44px on mobile. */}
      <button
        type="button"
        onClick={() => void handleMessage()}
        disabled={messageLoading || !owner}
        className="mt-3.5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60"
      >
        <Mail className="h-4 w-4" aria-hidden="true" />
        {messageLoading ? t("listingDetail.openingChat") : t("listingDetail.messageOwner")}
      </button>

      <button
        type="button"
        onClick={() => void toggleFavorite(listing.id)}
        aria-pressed={saved}
        className={`mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition active:scale-[0.99] ${
          saved
            ? "bg-primary/10 text-primary"
            : "border border-border bg-card text-foreground/75 hover:bg-surface-muted"
        }`}
      >
        <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} aria-hidden="true" />
        {saved ? t("listingDetail.saved") : t("listingDetail.saveListing")}
      </button>

      {owner && !owner.contactsHidden ? (
        <div className="mt-3 flex justify-center border-t border-border pt-3">
          <ContactLinks
            telegram={owner.telegram}
            phone={owner.phone}
            whatsapp={ownerContacts?.whatsapp}
            instagram={ownerContacts?.instagram}
            contactsHidden={owner.contactsHidden}
            size="sm"
          />
        </div>
      ) : null}

      {isOwnListing ? (
        <Link
          href={`/listings/${listing.id}/edit`}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-surface-muted"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          {t("listingDetail.editListing")}
        </Link>
      ) : null}
    </div>
  );
}
