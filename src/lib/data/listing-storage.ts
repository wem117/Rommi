import "server-only";

import { supabaseConfig } from "@/lib/supabase/config";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/server";

/**
 * Server-side storage cleanup for a listing's photos.
 *
 * `deleteImageByUrl` in lib/supabase/storage.ts cannot be used here: it posts to
 * a RELATIVE `/api/upload` URL, which only resolves inside a browser. Deleting
 * from a route handler needs the storage client directly.
 *
 * Deleting a listing without this leaves its photos in the bucket forever —
 * unreferenced, unreachable through the UI, and still counted against storage.
 * Nothing else ever collects them, because the only pointer to a photo is the
 * listing row that just disappeared.
 */

/** Turns a public storage URL back into the object path inside the bucket. */
export function storagePathFromUrl(url: string): string | null {
  const marker = `/${supabaseConfig.storageBucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const path = url.slice(index + marker.length).split("?")[0];
  return path || null;
}

/**
 * Best-effort removal of a listing's photos.
 *
 * Never throws. It runs AFTER the listing row is gone, so a storage hiccup must
 * not turn a completed delete into an error the user sees and retries — the row
 * is already deleted and retrying would only 404. Orphans are recoverable;
 * telling someone their delete failed when it succeeded is not.
 */
export async function deleteListingPhotos(photoUrls: string[]): Promise<number> {
  if (!isSupabaseAdminConfigured || !photoUrls.length) return 0;

  const paths = photoUrls
    .map(storagePathFromUrl)
    .filter((path): path is string => Boolean(path));

  if (!paths.length) return 0;

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage.from(supabaseConfig.storageBucket).remove(paths);
    if (error) return 0;
    return paths.length;
  } catch {
    return 0;
  }
}
