"use client";

import Link from "next/link";
import { formatDate } from "@/lib/utils/format";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import type { Conversation } from "@/types/chat";
import type { UserProfile } from "@/types/user";

export function ConversationItem({
  conversation,
  otherParticipant,
  className = "",
  onClick
}: {
  conversation: Conversation;
  otherParticipant?: UserProfile | null;
  className?: string;
  onClick?: () => void;
}) {
  const { user } = useAuth();
  const { t } = useLocale();
  const unread = user ? (conversation.unreadCounts?.[user.uid] ?? 0) : 0;
  const heading = otherParticipant?.fullName || conversation.listingTitle || t("chat.conversationFallback");
  const tag = otherParticipant?.fullName && conversation.listingTitle ? conversation.listingTitle : null;

  const body = (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-bold text-sm">{heading}</h3>
          {tag ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{tag}</span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-foreground/60 line-clamp-2">{conversation.lastMessage || t("chat.noMessagesYet")}</p>
      </div>
      <div className="text-right">
        <div className="text-xs text-foreground/50">{formatDate(conversation.updatedAt)}</div>
        {unread > 0 ? <div className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">{unread}</div> : null}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={`w-full text-left block border-b border-border p-4 ${className}`}>
        {body}
      </button>
    );
  }

  return (
    <Link href={`/inbox/${conversation.id}`} className={`block border-b border-border p-4 ${className}`}>
      {body}
    </Link>
  );
}

export default ConversationItem;
