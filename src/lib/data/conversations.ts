import { demoConversations, demoMessages } from "@/lib/data/demo";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mapConversationRow, mapMessageRow } from "@/lib/supabase/mappers";
import { isMissingSupabaseTable } from "@/lib/utils/errors";
import type { Conversation, Message } from "@/types/chat";

export async function getConversationsForUser(uid: string) {
  if (!isSupabaseConfigured) {
    return demoConversations.filter((conversation) => conversation.participantIds.includes(uid));
  }

  const supabase = getSupabaseBrowserClient() as any;
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .contains("participant_ids", [uid])
    .order("updated_at", { ascending: false });

  if (error && isMissingSupabaseTable(error, "conversations")) {
    return demoConversations.filter((conversation) => conversation.participantIds.includes(uid));
  }

  if (error) throw error;
  return (data ?? []).map(mapConversationRow);
}

export async function ensureConversation({
  participantIds,
  listingId,
  listingTitle
}: {
  participantIds: string[];
  listingId?: string | null;
  listingTitle?: string | null;
}) {
  if (!isSupabaseConfigured) {
    const existing = demoConversations.find(
      (conversation) =>
        conversation.listingId === (listingId ?? null) &&
        conversation.participantIds.length === participantIds.length &&
        conversation.participantIds.every((id) => participantIds.includes(id))
    );

    return existing?.id ?? demoConversations[0]?.id ?? "conversation-1";
  }

  const supabase = getSupabaseBrowserClient() as any;
  const { data: existingRows, error: lookupError } = await supabase
    .from("conversations")
    .select("*")
    .contains("participant_ids", [participantIds[0]]);

  if (lookupError && isMissingSupabaseTable(lookupError, "conversations")) {
    const existing = demoConversations.find(
      (conversation) =>
        conversation.listingId === (listingId ?? null) &&
        conversation.participantIds.length === participantIds.length &&
        conversation.participantIds.every((id) => participantIds.includes(id))
    );

    return existing?.id ?? demoConversations[0]?.id ?? "conversation-1";
  }

  if (lookupError) throw lookupError;

  const existing = (existingRows ?? []).map(mapConversationRow).find(
    (conversation: Conversation) =>
      conversation.listingId === (listingId ?? null) &&
      conversation.participantIds.length === participantIds.length &&
      conversation.participantIds.every((id: string) => participantIds.includes(id))
  );

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      participant_ids: participantIds,
      listing_id: listingId ?? null,
      listing_title: listingTitle ?? null,
      last_message: null,
      last_message_at: null,
      unread_counts: participantIds.reduce<Record<string, number>>((acc, id) => {
        acc[id] = 0;
        return acc;
      }, {})
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function getMessagesForConversation(conversationId: string) {
  if (!isSupabaseConfigured) {
    return demoMessages.filter((message) => message.conversationId === conversationId);
  }

  const supabase = getSupabaseBrowserClient() as any;
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error && isMissingSupabaseTable(error, "messages")) {
    return demoMessages.filter((message) => message.conversationId === conversationId);
  }

  if (error) throw error;
  return (data ?? []).map(mapMessageRow);
}

export async function sendConversationMessage({
  conversationId,
  senderId,
  text,
  imageUrl
}: {
  conversationId: string;
  senderId: string;
  text?: string;
  imageUrl?: string | null;
}) {
  if (!isSupabaseConfigured) return;

  const supabase = getSupabaseBrowserClient() as any;
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    text: text ?? "",
    image_url: imageUrl ?? null,
    read_by: [senderId]
  });

  if (error && isMissingSupabaseTable(error, "messages")) {
    return;
  }

  if (error) throw error;

  const { data: conversationRow } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  const unreadCounts = (conversationRow ? mapConversationRow(conversationRow).unreadCounts : null) ?? {};
  const nextUnreadCounts = Object.fromEntries(
    Object.entries(unreadCounts).map(([id, count]) => [id, id === senderId ? 0 : count + 1])
  );

  await supabase
    .from("conversations")
    .update({
      last_message: text ?? (imageUrl ? "Image" : ""),
      last_message_at: new Date().toISOString(),
      unread_counts: nextUnreadCounts,
      updated_at: new Date().toISOString()
    })
    .eq("id", conversationId);
}

export async function markConversationAsRead(conversationId: string, userId: string, messages: Message[]) {
  if (!isSupabaseConfigured) return;

  const supabase = getSupabaseBrowserClient() as any;
  const { data } = await supabase.from("conversations").select("unread_counts").eq("id", conversationId).single();
  const unreadCounts = ((data?.unread_counts as Record<string, number> | null) ?? {});
  unreadCounts[userId] = 0;

  await supabase
    .from("conversations")
    .update({ unread_counts: unreadCounts, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}
