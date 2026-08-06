import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { listingStatus } from "@/lib/utils/listing-status";
import type { Listing } from "@/types/listing";

const SRC = join(process.cwd(), "src");
const read = (p: string) => readFileSync(join(SRC, p), "utf8");
const code = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

function listing(over: Partial<Listing>): Listing {
  return {
    status: "approved",
    removed: false,
    archived: false,
    ...over
  } as Listing;
}

/**
 * The schema keeps three independent flags rather than one status column:
 * `removed` (saved but hidden — how a draft is stored), `archived`, and `status`
 * (moderation). Precedence lives in one place so the UI never has to reason
 * about the combinations.
 */
describe("listingStatus", () => {
  it("reports a live listing as published", () => {
    expect(listingStatus(listing({}))).toBe("published");
  });

  it("treats removed as draft", () => {
    expect(listingStatus(listing({ removed: true }))).toBe("draft");
  });

  it("reports archived", () => {
    expect(listingStatus(listing({ archived: true }))).toBe("archived");
  });

  it("lets archived win over draft", () => {
    // Both flags can be set at once; showing "draft" would hide the fact that
    // it is archived and therefore invisible either way.
    expect(listingStatus(listing({ removed: true, archived: true }))).toBe("archived");
  });

  it("reports a listing awaiting moderation as pending, not published", () => {
    // The gap this closes: `pending` fell through to the default arm, so a
    // listing sitting in the moderation queue told its owner it was live.
    expect(listingStatus(listing({ status: "pending" }))).toBe("pending");
  });

  it("lets the owner's own draft outrank the moderation queue", () => {
    // A listing the owner has hidden is theirs to finish, whatever a moderator
    // may also think of it.
    expect(listingStatus(listing({ status: "pending", removed: true }))).toBe("draft");
    expect(listingStatus(listing({ status: "pending", archived: true }))).toBe("archived");
  });

  it("lets moderation win over everything", () => {
    // A rejected listing is not "published" no matter what the other flags say.
    expect(listingStatus(listing({ status: "rejected" }))).toBe("rejected");
    expect(listingStatus(listing({ status: "rejected", archived: true }))).toBe("rejected");
  });
});

describe("ownership boundary", () => {
  it("reads listings through the COOKIE-scoped client, not service-role", () => {
    // RLS (select_listings_owner) decides what comes back. Using the
    // service-role client here would make this one function the only thing
    // standing between one user's listings and another's.
    const source = code(read("lib/data/my-listings.ts"));
    expect(source).toContain("createSupabaseServerClient");
    expect(source).not.toContain("createSupabaseAdminClient");
  });

  it("every owner-scoped route proves ownership before the privileged write", () => {
    const route = code(read("app/api/my-listings/[id]/route.ts"));
    expect(route).toContain("requireSessionUser");
    expect(route).toMatch(/owner_id !== user\.id/);
    expect(route).toContain("Forbidden");
  });

  it("duplicate checks ownership too, and never trusts the id alone", () => {
    const route = code(read("app/api/my-listings/[id]/duplicate/route.ts"));
    expect(route).toContain("requireSessionUser");
    expect(route).toMatch(/owner_id/);
    expect(route).toContain("Forbidden");
  });

  it("duplicates land as drafts, not live copies", () => {
    // Publishing an identical listing the instant someone clicks Duplicate
    // would put a copy in front of renters before it has been edited.
    expect(code(read("app/api/my-listings/[id]/duplicate/route.ts"))).toMatch(/removed:\s*true/);
  });

  it("deleting a listing also removes its stored photos", () => {
    // Nothing else ever collects them: the only pointer to a photo is the row.
    const route = code(read("app/api/my-listings/[id]/route.ts"));
    expect(route).toContain("deleteListingPhotos");
  });
});
