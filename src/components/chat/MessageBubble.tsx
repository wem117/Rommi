"use client";

import Image from "next/image";
import { formatDate } from "@/lib/utils/format";
import { useAuth } from "@/context/auth-context";
import type { Message } from "@/types/chat";
import { Check } from "lucide-react";

export function MessageBubble({ message }: { message: Message }) {
  const { user } = useAuth();
  const mine = user?.uid === message.senderId;

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} py-1`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${mine ? "bg-primary text-white" : "bg-background"}`}>
        {message.imageUrl ? (
          <div className="mb-2 w-full">
            <Image src={message.imageUrl} alt="Image message" width={400} height={300} className="rounded-md object-cover" />
          </div>
        ) : null}
        {message.text ? <p className="text-sm">{message.text}</p> : null}
        <div className={`mt-2 flex items-center justify-between text-[11px] ${mine ? "text-white/70" : "text-foreground/45"}`}>
          <span>{formatDate(message.createdAt)}</span>
          {mine ? <Check className="ml-2 h-3 w-3" /> : null}
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;
