"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { ensureConversation, getConversationsForUser } from "@/lib/data/conversations";
import type { Conversation } from "@/types/chat";

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const currentUser = user;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const nextConversations = await getConversationsForUser(currentUser.uid);
        if (!cancelled) setConversations(nextConversations);
      } catch (loadError) {
        console.error("Conversation load failed", loadError);
        if (!cancelled) setError("Could not load conversations.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 8000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user]);

  return { conversations, loading, error };
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
