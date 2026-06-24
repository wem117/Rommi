"use client";

import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { useEffect, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { converter, timestampToDate } from "@/lib/firebase/firestore";
import type { Message } from "@/types/chat";

function normalizeMessage(data: Message, id: string): Message {
  return {
    ...data,
    id,
    createdAt: timestampToDate(data.createdAt) ?? new Date()
  };
}

export function useMessages(conversationId?: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(Boolean(conversationId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    const id = conversationId;

    async function subscribe() {
      setLoading(true);
      const { db } = await import("@/lib/firebase/client");
      unsubscribe = onSnapshot(
        query(
          collection(db, "conversations", id, "messages").withConverter(converter<Message>()),
          orderBy("createdAt", "asc")
        ),
        (snapshot) => {
          setMessages(snapshot.docs.map((docSnapshot) => normalizeMessage(docSnapshot.data(), docSnapshot.id)));
          setLoading(false);
        },
        (snapshotError) => {
          console.error("Messages listener failed", snapshotError);
          setError("Could not load messages.");
          setLoading(false);
        }
      );
    }

    void subscribe();
    return () => unsubscribe?.();
  }, [conversationId]);

  async function sendMessage(text: string) {
    if (!conversationId || !user) return;

    const { db } = await import("@/lib/firebase/client");
    await addDoc(collection(db, "conversations", conversationId, "messages"), {
      conversationId,
      senderId: user.uid,
      text,
      readBy: [user.uid],
      createdAt: serverTimestamp()
    });
    await updateDoc(doc(db, "conversations", conversationId), {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  return { messages, loading, error, sendMessage };
}
