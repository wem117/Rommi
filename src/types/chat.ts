export interface Conversation {
  id: string;
  participantIds: string[];
  listingId?: string | null;
  listingTitle?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  unreadCounts?: Record<string, number> | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  imageUrl?: string | null;
  createdAt: Date;
  readBy: string[];
}
