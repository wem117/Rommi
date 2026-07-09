"use client";

import { useMemo, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/context/auth-context";
import { useConversations, useConversationParticipants } from "@/hooks/use-conversations";
import ConversationItem from "./ConversationItem";

export function ConversationList({ onSelect }: { onSelect?: (id: string) => void }) {
  const { user } = useAuth();
  const { conversations, loading } = useConversations();
  const participants = useConversationParticipants(conversations, user?.uid);
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 300);

  const filtered = useMemo(() => {
    if (!debounced) return conversations;
    const q = debounced.toLowerCase();
    return conversations.filter((c) => {
      const other = participants[c.participantIds.find((id) => id !== user?.uid) ?? ""];
      return (
        (c.listingTitle || "").toLowerCase().includes(q) ||
        (c.lastMessage || "").toLowerCase().includes(q) ||
        (other?.fullName || "").toLowerCase().includes(q)
      );
    });
  }, [conversations, debounced, participants, user?.uid]);

  return (
    <aside className="w-full max-w-sm border-r border-border">
      <div className="p-4">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations" className="w-full rounded-md border border-border px-3 py-2" />
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
        {loading ? <div className="p-4 text-sm text-foreground/60">Loading...</div> : null}
        {!loading && filtered.length === 0 ? <div className="p-4 text-sm text-foreground/60">No conversations</div> : null}
        {filtered.map((c) => (
          <ConversationItem
            key={c.id}
            conversation={c}
            otherParticipant={participants[c.participantIds.find((id) => id !== user?.uid) ?? ""]}
            onClick={() => onSelect?.(c.id)}
          />
        ))}
      </div>
    </aside>
  );
}

export default ConversationList;
