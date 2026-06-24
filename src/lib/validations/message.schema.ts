import { z } from "zod";

export const messageSchema = z.object({
  text: z.string().trim().min(1, "Message cannot be empty").max(1000, "Message is too long")
});

export type MessageInput = z.infer<typeof messageSchema>;
