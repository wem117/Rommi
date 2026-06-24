"use client";

import { useParams } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-4xl flex-col px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold">Conversation</h1>
      <section className="mt-6 flex min-h-[50vh] flex-1 flex-col rounded-2xl bg-white shadow-soft">
        <ChatWindow conversationId={chatId} />
      </section>
    </main>
  );
}
