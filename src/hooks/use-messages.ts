"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/context/auth-context";
import {
  getMessagesForConversation,
  markConversationAsRead,
  sendConversationMessage
} from "@/lib/data/conversations";
import { uploadImageFile } from "@/lib/supabase/storage";
import { friendlySupabaseError } from "@/lib/utils/errors";
import type { Message } from "@/types/chat";

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

    const currentConversationId = conversationId;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const nextMessages = await getMessagesForConversation(currentConversationId);
        if (!cancelled) {
          setMessages(nextMessages);
          if (user) {
            await markConversationAsRead(currentConversationId, user.uid, nextMessages);
          }
        }
      } catch (loadError) {
        console.error("Messages load failed", loadError);
        if (!cancelled) setError(friendlySupabaseError(loadError, "Could not load messages."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [conversationId, user]);

  async function sendMessage({ text, imageFile }: { text?: string; imageFile?: File }) {
    if (!conversationId || !user) return;

    let imageUrl: string | undefined;
    if (imageFile) {
      const result = await uploadImageFile({ file: imageFile, kind: "messages" });
      imageUrl = result.url;
    }

    await sendConversationMessage({
      conversationId,
      senderId: user.uid,
      text,
      imageUrl: imageUrl ?? null
    });

    const nextMessages = await getMessagesForConversation(conversationId);
    setMessages(nextMessages);
  }

  return { messages, loading, error, sendMessage };
}
