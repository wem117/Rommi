import type { Listing } from "@/types/listing";

/**
 * A listing's state as its owner sees it.
 *
 * Deliberately in its own module with NO "server-only": the owner page renders
 * these badges on the client, and importing them from the server data module
 * would drag `createSupabaseServerClient` into the browser bundle (which fails
 * the build, as it should).
 *
 * The schema stores three independent flags rather than one status column:
 * `removed` (saved but hidden — how a draft is represented), `archived`, and
 * `status` (moderation). Precedence lives here so the UI never reasons about the
 * combinations: archived beats draft, and moderation beats both, because a
 * rejected listing is not "published" whatever the other flags say.
 */
export type MyListingStatus = "published" | "draft" | "archived" | "rejected";

export function listingStatus(listing: Pick<Listing, "status" | "removed" | "archived">): MyListingStatus {
  if (listing.status === "rejected") return "rejected";
  if (listing.archived) return "archived";
  if (listing.removed) return "draft";
  return "published";
}
