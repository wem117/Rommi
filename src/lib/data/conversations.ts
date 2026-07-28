import { demoConversations, demoMessages } from "@/lib/data/demo";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mapConversationRow, mapMessageRow } from "@/lib/supabase/mappers";
import { isMissingRpc, isMissingSupabaseTable } from "@/lib/utils/errors";
import type { Conversation } from "@/types/chat";

export async function getConversationsForUser(uid: string) {
  if (!isSupabaseConfigured) {
    return demoConversations.filter((conversation) => conversation.participantIds.includes(uid));
  }

  const supabase = getSupabaseBrowserClient();
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

  const supabase = getSupabaseBrowserClient();

  // Atomic get-or-create keyed on the sorted participant set + listing, so two
  // users opening the same chat at once converge on ONE conversation row
  // (supabase/migrations/20240101001400_atomic_mutations.sql). Falls back to the legacy
  // select-then-insert only when the RPC hasn't been applied.
  const { data: rpcId, error: rpcError } = await supabase.rpc("get_or_create_conversation", {
    p_participant_ids: participantIds,
    p_listing_id: listingId ?? null,
    p_listing_title: listingTitle ?? null
  });

  if (!rpcError && rpcId) return rpcId as string;
  if (rpcError && !isMissingRpc(rpcError)) {
    if (isMissingSupabaseTable(rpcError, "conversations")) {
      const existingDemo = demoConversations.find(
        (conversation) =>
          conversation.listingId === (listingId ?? null) &&
          conversation.participantIds.length === participantIds.length &&
          conversation.participantIds.every((id) => participantIds.includes(id))
      );
      return existingDemo?.id ?? demoConversations[0]?.id ?? "conversation-1";
    }
    throw rpcError;
  }

  // --- Legacy fallback (RPC not applied): non-atomic lookup then insert ---
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

  const supabase = getSupabaseBrowserClient();
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

  const supabase = getSupabaseBrowserClient();
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

  const lastMessage = text ?? (imageUrl ? "Image" : "");

  // Atomic: increment every other participant's unread count and reset the
  // sender's, in one server-side UPDATE. Avoids the read-modify-write race that
  // corrupted counters under concurrent sends.
  const { error: bumpError } = await supabase.rpc("bump_conversation_after_send", {
    p_conversation_id: conversationId,
    p_last_message: lastMessage
  });

  if (!bumpError) return;
  if (!isMissingRpc(bumpError)) throw bumpError;

  // Legacy fallback (racy).
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
      last_message: lastMessage,
      last_message_at: new Date().toISOString(),
      unread_counts: nextUnreadCounts,
      updated_at: new Date().toISOString()
    })
    .eq("id", conversationId);
}

export async function markConversationAsRead(conversationId: string, userId: string) {
  if (!isSupabaseConfigured) return;

  const supabase = getSupabaseBrowserClient();

  // Atomic reset of the caller's own unread counter.
  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId
  });

  if (!error) return;
  if (!isMissingRpc(error)) throw error;

  // Legacy fallback (racy).
  const { data } = await supabase.from("conversations").select("unread_counts").eq("id", conversationId).single();
  const unreadCounts = ((data?.unread_counts as Record<string, number> | null) ?? {});
  unreadCounts[userId] = 0;

  await supabase
    .from("conversations")
    .update({ unread_counts: unreadCounts, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}
