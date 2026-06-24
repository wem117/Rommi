"use client";

import { useState } from "react";

import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";

export default function InboxPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold">Inbox</h1>
      <p className="mt-2 text-foreground/65">Your conversations with roommates and listing owners.</p>

      <div className="mt-6 flex h-[70vh] flex-col gap-4 rounded-2xl bg-white shadow-soft md:flex-row">
        <ConversationList onSelect={(id) => setSelected(id)} />
        <div className="flex-1 p-4">
          {selected ? <ChatWindow conversationId={selected} /> : <div className="h-full flex items-center justify-center text-foreground/60">Select a conversation to start chatting.</div>}
        </div>
      </div>
    </main>
  );
}
