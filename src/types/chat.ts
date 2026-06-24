export interface Conversation {
  id: string;
  participantIds: string[];
  listingId?: string | null;
  listingTitle?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: Date;
  readBy: string[];
}
