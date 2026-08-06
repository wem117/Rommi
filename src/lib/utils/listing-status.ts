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
 * `status` (moderation: pending | approved | rejected). Precedence lives here so
 * the UI never reasons about the combinations.
 *
 * The order below is the one an owner would give if asked "what is this listing
 * doing right now":
 *
 *   rejected  a verdict has been reached; nothing else about the row changes it
 *   archived  the owner put it away themselves
 *   draft     the owner is still working on it (`removed` = saved but hidden)
 *   pending   submitted, waiting on a moderator
 *   published live
 *
 * `pending` sits BELOW draft deliberately: a listing the owner has hidden is
 * theirs to finish, whatever a moderator may also think of it. It sits above
 * `published` because those are the two that used to be confused — a listing
 * awaiting moderation reported itself as "Published" to its owner, which is
 * the one thing it definitely was not.
 */
export type MyListingStatus = "published" | "pending" | "draft" | "archived" | "rejected";

export function listingStatus(listing: Pick<Listing, "status" | "removed" | "archived">): MyListingStatus {
  if (listing.status === "rejected") return "rejected";
  if (listing.archived) return "archived";
  if (listing.removed) return "draft";
  if (listing.status === "pending") return "pending";
  return "published";
}
