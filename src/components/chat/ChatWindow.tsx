"use client";

import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { useMessages } from "@/hooks/use-messages";

export function ChatWindow({ conversationId }: { conversationId?: string }) {
  const { messages, loading, error, sendMessage } = useMessages(conversationId);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  return (
    <section className="flex-1 min-w-0 flex-col">
      <div className="flex-1 overflow-y-auto p-4" ref={listRef}>
        {loading ? <div className="text-sm text-foreground/60">Loading messages...</div> : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        {!loading && !messages.length ? <div className="text-sm text-foreground/60">No messages yet.</div> : null}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>
      <MessageInput onSend={({ text, imageFile }) => sendMessage({ text, imageFile })} />
    </section>
  );
}

export default ChatWindow;
