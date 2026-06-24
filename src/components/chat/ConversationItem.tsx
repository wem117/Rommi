"use client";

import Link from "next/link";
import { formatDate } from "@/lib/utils/format";
import { useAuth } from "@/context/auth-context";
import type { Conversation } from "@/types/chat";

export function ConversationItem({ conversation, className = "", onClick }: { conversation: Conversation; className?: string; onClick?: () => void }) {
  const { user } = useAuth();
  const unread = user ? (conversation.unreadCounts?.[user.uid] ?? 0) : 0;

  if (onClick) {
    return (
      <button onClick={onClick} className={`w-full text-left block border-b border-border p-4 ${className}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-heading font-bold text-sm">{conversation.listingTitle || "Conversation"}</h3>
            <p className="mt-1 text-xs text-foreground/60 line-clamp-2">{conversation.lastMessage || "No messages yet"}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-foreground/50">{formatDate(conversation.updatedAt)}</div>
            {unread > 0 ? <div className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">{unread}</div> : null}
          </div>
        </div>
      </button>
    );
  }

  return (
    <Link href={`/inbox/${conversation.id}`} className={`block border-b border-border p-4 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-heading font-bold text-sm">{conversation.listingTitle || "Conversation"}</h3>
          <p className="mt-1 text-xs text-foreground/60 line-clamp-2">{conversation.lastMessage || "No messages yet"}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-foreground/50">{formatDate(conversation.updatedAt)}</div>
          {unread > 0 ? <div className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">{unread}</div> : null}
        </div>
      </div>
    </Link>
  );
}

export default ConversationItem;
