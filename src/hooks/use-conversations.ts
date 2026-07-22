"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { ensureConversation, getConversationsForUser } from "@/lib/data/conversations";
import { getProfileById } from "@/lib/data/profiles";
import { debugSupabaseError, friendlySupabaseError } from "@/lib/utils/errors";
import { type AsyncStatus, withRetry } from "@/lib/utils/retry";
import type { Conversation } from "@/types/chat";
import type { UserProfile } from "@/types/user";

export function getOtherParticipantId(conversation: Pick<Conversation, "participantIds">, currentUserId?: string) {
  return conversation.participantIds.find((participantId) => participantId !== currentUserId);
}

// Resolves the *other* participant's profile for each conversation, so chat
// lists/headers can show "Yeraly Zharylkassyn" instead of a generic
// "Conversation" placeholder or the listing title.
export function useConversationParticipants(conversations: Conversation[], currentUserId?: string) {
  const [profiles, setProfiles] = useState<Record<string, UserProfile | null>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!currentUserId || !conversations.length) {
        if (!cancelled) {
          setProfiles(prev => Object.keys(prev).length === 0 ? prev : {});
        }
        return;
      }

      const otherIds = [
        ...new Set(
          conversations
            .map((conversation) => getOtherParticipantId(conversation, currentUserId))
            .filter((id): id is string => Boolean(id))
        )
      ];

      const entries = await Promise.all(
        otherIds.map(async (id) => [id, await getProfileById(id).catch(() => null)] as const)
      );

      if (!cancelled) setProfiles(Object.fromEntries(entries));
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [conversations, currentUserId]);

  return profiles;
}

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
