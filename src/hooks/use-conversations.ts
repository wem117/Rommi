"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { ensureConversation, getConversationsForUser } from "@/lib/data/conversations";
import { debugSupabaseError, friendlySupabaseError } from "@/lib/utils/errors";
import { type AsyncStatus, withRetry } from "@/lib/utils/retry";
import type { Conversation } from "@/types/chat";

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AsyncStatus>("idle");

  const load = useCallback(
    async (currentUserId: string) => {
      setLoading(true);
      setError(null);
      setStatus("loading");
      try {
        const nextConversations = await withRetry(() => getConversationsForUser(currentUserId), {
          onRetry: () => setStatus("retrying")
        });
        setConversations(nextConversations);
        setStatus("success");
      } catch (loadError) {
        console.error("Conversation load failed", debugSupabaseError(loadError));
        setError(friendlySupabaseError(loadError, "Could not load conversations."));
        setStatus("error");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      setStatus("idle");
      return;
    }

    const currentUser = user;
    let cancelled = false;

    async function loadCurrentUser() {
      await load(currentUser.uid);
      if (cancelled) return;
    }

    void loadCurrentUser();
    const interval = window.setInterval(() => void load(currentUser.uid), 8000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [load, user]);

  return {
    conversations,
    data: conversations,
    loading,
    error,
    status,
    retry: () => (user ? load(user.uid) : Promise.resolve())
  };
}

export async function createConversation({
  participantIds,
  listingId,
  listingTitle
}: {
  participantIds: string[];
  listingId?: string | null;
  listingTitle?: string | null;
}) {
  return ensureConversation({ participantIds, listingId, listingTitle });
}
