import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Regression cover for "admin-entered contacts never appear on the listing".
 *
 * PUBLIC_PROFILE_COLUMNS deliberately omits telegram/phone so an anonymous read
 * can never surface them. The listing detail page fetched the owner through that
 * public column list, so the phone and Telegram the admin had typed were simply
 * never selected — the data was saved correctly and silently never displayed.
 *
 * The page sits behind requirePageAuth, so contacts belong there; it just has to
 * fetch them with a client that is allowed to read them.
 */
const SRC = join(process.cwd(), "src");
const read = (p: string) => readFileSync(join(SRC, p), "utf8");
const code = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("listing owner contacts", () => {
  it("PUBLIC_PROFILE_COLUMNS still excludes contact fields", () => {
    // If this ever changes, anon could read phone numbers — the privacy design
    // depends on it staying out.
    const profiles = read("lib/data/profiles.ts");
    const block = profiles.slice(
      profiles.indexOf("PUBLIC_PROFILE_COLUMNS"),
      profiles.indexOf("].join")
    );
    expect(block).not.toContain('"telegram"');
    expect(block).not.toContain('"phone"');
  });

  it("the owner fetch selects the contact columns explicitly", () => {
    const server = code(read("lib/data/profiles-server.ts"));
    expect(server).toContain("getListingOwnerServer");
    expect(server).toMatch(/telegram/);
    expect(server).toMatch(/phone/);
    expect(server).toMatch(/contacts_hidden/);
  });

  it("the listing detail page uses the contact-aware fetch", () => {
    const page = code(read("app/(main)/rooms/[listingId]/page.tsx"));
    expect(page).toContain("getListingOwnerServer");
    expect(page).not.toContain("getPublicProfileByIdServer");
  });

  it("that page is still auth-gated, which is what makes this safe", () => {
    const page = code(read("app/(main)/rooms/[listingId]/page.tsx"));
    expect(page).toContain("requirePageAuth");
  });
});
