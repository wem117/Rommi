"use client";

import { Send } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { useMessages } from "@/hooks/use-messages";
import { formatDate } from "@/lib/utils/format";

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const { user } = useAuth();
  const { messages, loading, error, sendMessage } = useMessages(chatId);
  const [text, setText] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    try {
      await sendMessage(text.trim());
      setText("");
    } catch (sendError) {
      console.error(sendError);
      toast.error("Could not send message");
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-4xl flex-col px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold">Conversation</h1>
      <section className="mt-6 flex min-h-[50vh] flex-1 flex-col rounded-2xl bg-white shadow-soft">
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {loading ? <p className="text-sm text-foreground/60">Loading messages...</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {!loading && !messages.length ? <p className="text-sm text-foreground/60">No messages yet.</p> : null}
          {messages.map((message) => {
            const mine = message.senderId === user?.uid;
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${mine ? "bg-primary text-white" : "bg-background"}`}>
                  <p className="text-sm">{message.text}</p>
                  <p className={`mt-1 text-[11px] ${mine ? "text-white/70" : "text-foreground/45"}`}>
                    {formatDate(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <form onSubmit={submit} className="flex gap-2 border-t border-border p-4">
          <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Write a message" />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 text-white"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </section>
    </main>
  );
}
