"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/context/auth-context";
import {
  getMessagesForConversation,
  markConversationAsRead,
  sendConversationMessage
} from "@/lib/data/conversations";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mapMessageRow } from "@/lib/supabase/mappers";
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
            await markConversationAsRead(currentConversationId, user.uid);
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

    // Realtime: subscribe to new messages for this conversation instead of
    // polling. RLS restricts delivery to conversation participants. If the
    // channel can't establish (realtime disabled / network), fall back to a slow
    // poll so chat still works — never worse than the previous behavior.
    if (!isSupabaseConfigured) {
      return () => {
        cancelled = true;
      };
    }

    const supabase = getSupabaseBrowserClient();
    let pollId: number | undefined;

    const channel = supabase
      .channel(`messages:${currentConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${currentConversationId}`
        },
        (payload) => {
          const message = mapMessageRow(payload.new as Record<string, unknown>);
          setMessages((current) =>
            current.some((existing) => existing.id === message.id) ? current : [...current, message]
          );
          // A message from the other party while we're viewing => mark read.
          if (user && message.senderId !== user.uid) {
            void markConversationAsRead(currentConversationId, user.uid);
          }
        }
      )
      .subscribe((status) => {
        if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && !pollId) {
          pollId = window.setInterval(() => void load(), 5000);
        }
      });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
      if (pollId) window.clearInterval(pollId);
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

    // Optimistic refresh for the sender; the realtime INSERT echo is de-duped by
    // id in the subscription handler, so this can't create duplicates.
    const nextMessages = await getMessagesForConversation(conversationId);
    setMessages(nextMessages);
  }

  return { messages, loading, error, sendMessage };
}
