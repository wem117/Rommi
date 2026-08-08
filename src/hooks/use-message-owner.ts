"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/context/auth-context";
import { createConversation } from "@/hooks/use-conversations";
import { recordContactedListing } from "@/lib/data/profiles";
import type { Listing } from "@/types/listing";
import type { UserProfile } from "@/types/user";

/**
 * "Message the owner", shared by the contact card and the mobile sticky bar.
 *
 * Extracted rather than copied. Two buttons that both open a conversation are
 * two chances for the sign-in redirect, the contacted-listing record or the
 * conversation shape to drift apart — and the failure would be silent, since
 * either path on its own looks like it works.
 */
export function useMessageOwner(listing: Listing, owner: UserProfile | null) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  async function messageOwner() {
    if (!owner) return;
    if (!user) {
      // Come back to this listing after signing in, not to the home page.
      router.push(`/sign-in?redirect=/rooms/${listing.id}`);
      return;
    }

    setLoading(true);
    try {
      // Fire-and-forget: a failure to record the view must not block the
      // conversation the person actually asked for.
      void recordContactedListing(user.uid, listing.id);
      const conversationId = await createConversation({
        participantIds: [user.uid, owner.uid],
        listingId: listing.id,
        listingTitle: listing.title
      });
      router.push(`/inbox/${conversationId}`);
    } finally {
      setLoading(false);
    }
  }

  return { messageOwner, loading, canMessage: Boolean(owner) };
}
