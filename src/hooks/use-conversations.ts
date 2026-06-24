"use client";

import { collection, onSnapshot, orderBy, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
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
    ,
    unreadCounts: (data as any).unreadCounts ?? null
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

export async function createConversation({ participantIds, listingId, listingTitle }: { participantIds: string[]; listingId?: string | null; listingTitle?: string | null }) {
  const [{ db }, { where: whereFn, query: qFn, collection: collFn, getDocs: getDocsFn, addDoc: addDocFn, serverTimestamp: ts }] = await Promise.all([
    import("@/lib/firebase/client"),
    import("firebase/firestore")
  ]).catch(() => [null]);

  if (!db) throw new Error("Firebase not initialized");

  // try to find existing conversation for same listing and same participants
  const currentUid = participantIds[0];
  const convQuery = query(collection(db, "conversations"), where("participantIds", "array-contains", currentUid));
  const snapshot = await getDocs(convQuery);
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as Conversation;
    const ids = data.participantIds || [];
    if ((listingId == null ? data.listingId == null : data.listingId === listingId) && ids.length === participantIds.length && ids.every((id) => participantIds.includes(id))) {
      return docSnap.id;
    }
  }

  // create new conversation
  const convRef = await addDoc(collection(db, "conversations"), {
    participantIds,
    listingId: listingId ?? null,
    listingTitle: listingTitle ?? null,
    lastMessage: null,
    lastMessageAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    unreadCounts: participantIds.reduce<Record<string, number>>((acc, id) => {
      acc[id] = 0;
      return acc;
    }, {})
  });

  return convRef.id;
}
