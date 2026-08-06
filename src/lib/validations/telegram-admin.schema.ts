import { z } from "zod";

/**
 * Admin → Telegram: the session the importer connects as, and the channels it
 * watches.
 */

/**
 * A Telethon StringSession.
 *
 * Validated only for shape, never for content: it is an opaque base64-ish blob
 * and the sole authority on whether it works is Telegram itself, which the
 * worker asks on the next connect. What the bound DOES catch is the two
 * mistakes people actually make — pasting an empty box, or pasting the whole
 * `.session` SQLite file, which is binary and much larger.
 */
const sessionString = z
  .string()
  .trim()
  .min(16, "That does not look like a session string.")
  .max(4096, "That looks like a .session file rather than a session string. Export the string form.")
  .refine((value) => !value.includes("\0"), "Session strings are text; this looks like a binary file.");

export const telegramSessionUploadSchema = z.object({
  label: z.string().trim().min(1, "Give the account a label").max(80),
  sessionString
});

export const telegramSessionActionSchema = z.object({
  action: z.enum(["activate", "deactivate", "delete"])
});

export const telegramSourceSchema = z.object({
  name: z.string().trim().min(1, "Give the channel a name").max(120),
  telegramUsername: z
    .string()
    .trim()
    .min(1, "Enter the @username or numeric id")
    .max(120)
    // Telethon accepts "@name", "name" and a numeric chat id; anything else it
    // will simply fail to resolve, loudly, at startup.
    .refine(
      (value) => /^@?[a-zA-Z0-9_]{3,64}$/.test(value) || /^-?\d{5,20}$/.test(value),
      "Enter a Telegram @username or a numeric chat id."
    ),
  type: z.enum(["channel", "group"]).default("channel"),
  enabled: z.boolean().default(true),
  // Lower runs first. A plain integer rather than an ordered list: reordering
  // one channel should not rewrite every other row.
  priority: z.number().int().min(0).max(9999).default(100),
  // Used only as a FALLBACK when a post names no city of its own.
  defaultCity: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(500).default("")
});

export const telegramSourceUpdateSchema = telegramSourceSchema.partial();

export type TelegramSessionUploadInput = z.infer<typeof telegramSessionUploadSchema>;
export type TelegramSourceInput = z.infer<typeof telegramSourceSchema>;
