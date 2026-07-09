"use client";

import { useParams } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useAuth } from "@/context/auth-context";
import { useConversations, useConversationParticipants } from "@/hooks/use-conversations";

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const { user } = useAuth();
  const { conversations } = useConversations();
  const conversation = conversations.find((c) => c.id === chatId);
  const participants = useConversationParticipants(conversation ? [conversation] : [], user?.uid);
  const otherId = conversation?.participantIds.find((id) => id !== user?.uid) ?? "";
  const heading = participants[otherId]?.fullName || conversation?.listingTitle || "Conversation";

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-4xl flex-col px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold">{heading}</h1>
      {conversation?.listingTitle && participants[otherId]?.fullName ? (
        <p className="mt-1 text-sm text-foreground/60">About: {conversation.listingTitle}</p>
      ) : null}
      <section className="mt-6 flex min-h-[50vh] flex-1 flex-col rounded-2xl bg-white shadow-soft">
        <ChatWindow conversationId={chatId} />
      </section>
    </main>
  );
}
