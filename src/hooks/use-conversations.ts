"use client";

import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { converter, timestampToDate } from "@/lib/firebase/firestore";
import type { Conversation } from "@/types/chat";

function normalizeConversation(data: Conversation, id: string): Conversation {
  return {
    ...data,
    id,
    lastMessageAt: timestampToDate(data.lastMessageAt) ?? null,
    createdAt: timestampToDate(data.createdAt) ?? new Date(),
    updatedAt: timestampToDate(data.updatedAt) ?? new Date()
  };
}

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

    let unsubscribe: (() => void) | undefined;
    const uid = user.uid;

    async function subscribe() {
      setLoading(true);
      const { db } = await import("@/lib/firebase/client");
      unsubscribe = onSnapshot(
        query(
          collection(db, "conversations").withConverter(converter<Conversation>()),
          where("participantIds", "array-contains", uid),
          orderBy("updatedAt", "desc")
        ),
        (snapshot) => {
          setConversations(snapshot.docs.map((docSnapshot) => normalizeConversation(docSnapshot.data(), docSnapshot.id)));
          setLoading(false);
        },
        (snapshotError) => {
          console.error("Conversation listener failed", snapshotError);
          setError("Could not load conversations.");
          setLoading(false);
        }
      );
    }

    void subscribe();
    return () => unsubscribe?.();
  }, [user]);

  return { conversations, loading, error };
}
