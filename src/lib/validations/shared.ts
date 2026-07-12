import { z } from "zod";

/**
 * An image reference for admin-managed content. Accepts either an absolute
 * http(s) URL (e.g. an uploaded Supabase public URL) or a root-relative path
 * to a bundled asset (e.g. "/universities/kaznu.jpeg"). Empty string means
 * "no image". Zod's `.url()` rejects root-relative paths, which broke editing
 * any record that stores a local image path, so use this everywhere an image
 * URL/path is accepted.
 *
 * Deliberately carries NO `.optional().default()`: in Zod 4, `.partial()`
 * does not neutralize `.default()`, so defaults inside update schemas inject
 * phantom values into PATCH payloads and silently reset unrelated columns.
 * Create schemas append `.optional().default("")`; update schemas append
 * only `.optional()`.
 */
export const imageReference = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === "" || value.startsWith("/") || /^https?:\/\//i.test(value), {
    message: "Enter a full URL (https://…) or a path starting with /"
  });
