"use client";

import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { useEffect, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { converter, timestampToDate } from "@/lib/firebase/firestore";
import { uploadImageFile } from "@/lib/firebase/storage";
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
          const next = snapshot.docs.map((docSnapshot) => normalizeMessage(docSnapshot.data(), docSnapshot.id));
          setMessages(next);
          // mark unread messages as read for current user
          if (user) {
            next.forEach(async (m) => {
              if (!m.readBy.includes(user.uid)) {
                try {
                  await updateDoc(doc(db, "conversations", id, "messages", m.id), {
                    readBy: arrayUnion(user.uid)
                  });
                } catch (e) {
                  // non-fatal
                }
              }
            });
            // Also update conversation unreadCounts: reset for this user
            try {
              await updateDoc(doc(db, "conversations", id), {
                ["unreadCounts." + user.uid]: 0
              });
            } catch (e) {
              // ignore
            }
          }
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

  async function sendMessage({ text, imageFile }: { text?: string; imageFile?: File }) {
    if (!conversationId || !user) return;

    const { db } = await import("@/lib/firebase/client");

    let imageUrl: string | undefined;
    if (imageFile) {
      const path = `messages/${conversationId}/${crypto.randomUUID()}.${imageFile.name.split(".").pop()}`;
      imageUrl = await uploadImageFile({ file: imageFile, path });
    }

    const messagePayload: Partial<Message> = {
      conversationId,
      senderId: user.uid,
      text: text ?? "",
      imageUrl: imageUrl ?? null,
      readBy: [user.uid],
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, "conversations", conversationId, "messages"), messagePayload);

    // update conversation metadata and increment unread counts for other participants
    try {
      const convRef = doc(db, "conversations", conversationId);
      await updateDoc(convRef, {
        lastMessage: text ?? (imageUrl ? "Image" : ""),
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      // ignore
    }
  }

  return { messages, loading, error, sendMessage };
}
