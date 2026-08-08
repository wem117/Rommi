"use client";

import { Heart, Mail } from "lucide-react";

import { useLocale } from "@/context/locale-context";
import { useAuth } from "@/context/auth-context";
import { useFavorites } from "@/hooks/use-favorites";
import { useMessageOwner } from "@/hooks/use-message-owner";
import { formatListingPrice } from "@/lib/utils/format";
import type { Listing } from "@/types/listing";
import type { UserProfile } from "@/types/user";

/**
 * Mobile-only sticky contact bar.
 *
 * On a phone the contact card sits after the description, the amenities and the
 * map — a long way down a page people scroll through slowly. The primary action
 * of the entire page was therefore off-screen for most of the time anyone spent
 * on it. Every marketplace solves this the same way, and for the same reason.
 *
 * `lg:hidden`, because from `lg` the contact card is already a sticky sidebar
 * and a second fixed control would be redundant clutter.
 *
 * The action comes from `useMessageOwner`, the same hook the card uses, so the
 * two buttons cannot drift on sign-in redirect or conversation shape.
 */
export function ListingStickyCta({
  listing,
  owner
}: {
  listing: Listing;
  owner: UserProfile | null;
}) {
  const { t } = useLocale();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { messageOwner, loading } = useMessageOwner(listing, owner);

  // The owner does not need a "message yourself" bar.
  if (user?.uid === listing.ownerId) return null;

  const saved = isFavorite(listing.id);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden"
      // The gesture bar on modern phones overlaps a fixed element, so the whole
      // bar is padded by the safe area rather than the button being pushed into
      // an unreachable strip.
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="font-heading text-base font-extrabold leading-none tracking-[-0.02em] text-foreground tabular-nums">
            {formatListingPrice(listing.monthlyRent, listing.depositRequired, listing.depositAmount)}
          </div>
          <p className="mt-0.5 truncate text-xs text-foreground/55">{listing.city}</p>
        </div>

        <button
          type="button"
          onClick={() => void toggleFavorite(listing.id)}
          aria-pressed={saved}
          aria-label={saved ? t("listingDetail.saved") : t("listingDetail.saveListing")}
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition active:scale-95 ${
            saved ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-card text-foreground/70"
          }`}
        >
          <Heart className={`h-5 w-5 ${saved ? "fill-current" : ""}`} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => void messageOwner()}
          disabled={loading || !owner}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          {loading ? t("listingDetail.openingChat") : t("listingDetail.messageOwner")}
        </button>
      </div>
    </div>
  );
}
