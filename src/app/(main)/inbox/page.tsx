"use client";

import Link from "next/link";

import { useConversations } from "@/hooks/use-conversations";
import { formatDate } from "@/lib/utils/format";

export default function InboxPage() {
  const { conversations, loading, error } = useConversations();

  return (
    <main className="mx-auto min-h-[70vh] max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold">Inbox</h1>
      <p className="mt-2 text-foreground/65">Your conversations with roommates and listing owners.</p>

      {loading ? <div className="mt-8 rounded-2xl bg-white p-8 shadow-soft">Loading conversations...</div> : null}
      {error ? <div className="mt-8 rounded-2xl bg-white p-8 shadow-soft">{error}</div> : null}
      {!loading && !error && conversations.length ? (
        <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-soft">
          {conversations.map((conversation) => (
            <Link key={conversation.id} href={`/inbox/${conversation.id}`} className="block border-b border-border p-5 last:border-0">
              <div className="flex justify-between gap-4">
                <div>
                  <h2 className="font-heading font-bold">{conversation.listingTitle || "Conversation"}</h2>
                  <p className="mt-1 text-sm text-foreground/60">{conversation.lastMessage || "No messages yet"}</p>
                </div>
                <span className="text-xs text-foreground/50">{formatDate(conversation.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
      {!loading && !error && !conversations.length ? (
        <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow-soft">No conversations yet.</div>
      ) : null}
    </main>
  );
}
