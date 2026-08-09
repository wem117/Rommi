import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Regression cover for: every new user saw
 * "You do not have permission for that action yet. Try again after signing in."
 *
 * ROOT CAUSE (two defects in one path)
 *
 *   1. With email confirmation enabled, supabase.auth.signUp() returns the
 *      created USER but NO SESSION. The sign-up page branched on `user`, so it
 *      skipped the confirm-email branch and continued as if signed in.
 *
 *   2. It then resolved a post-auth destination, which reads the profile via
 *      getProfileById(). That used `select("*")` — and `anon` holds only
 *      COLUMN-level SELECT on profiles (telegram and phone are deliberately
 *      excluded by the contact-privacy migration). Postgres answers a wildcard
 *      read with 42501 "permission denied for table profiles" rather than
 *      returning the readable subset, and friendlySupabaseError maps
 *      /permission denied/ to that message.
 *
 * Verified against production before the fix: `select=*` as anon returned 42501,
 * while the same read restricted to public columns returned [].
 */
const SRC = join(process.cwd(), "src");
const read = (p: string) => readFileSync(join(SRC, p), "utf8");
const code = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("signup without a session", () => {
  it("the sign-up page gates on the session, not just the user", () => {
    // `user` is present even when confirmation is pending; only a session means
    // the visitor can actually read anything.
    const page = code(read("app/(auth)/sign-up/page.tsx"));
    expect(page).toMatch(/!authResult\.session/);
  });
});

describe("anonymous profile reads", () => {
  it("getProfileById never issues a wildcard read, signed in or not", () => {
    const profiles = code(read("lib/data/profiles.ts"));
    // Stronger than the rule this test originally held. The wildcard used to be
    // permitted on the signed-in branch, which is precisely what let one account
    // harvest phone/telegram/email for the whole table in a single PostgREST
    // request. There is now no branch on which it is allowed.
    expect(profiles).not.toMatch(/session \? "\*"/);
    expect(profiles).not.toMatch(/from\("profiles"\)\s*\.select\("\*"\)/);
  });

  it("reveals contacts only through the RPC that enforces contacts_hidden", () => {
    const profiles = code(read("lib/data/profiles.ts"));
    // get_profile_contacts() re-checks authentication, contacts_hidden, banned
    // and suspended in SQL. Selecting the columns directly would bypass all four.
    expect(profiles).toMatch(/rpc\("get_profile_contacts"/);
  });

  it("PUBLIC_PROFILE_COLUMNS stays free of contact fields", () => {
    // The reason a wildcard read fails for anon in the first place. If contacts
    // were ever added here, anon could read phone numbers.
    const profiles = read("lib/data/profiles.ts");
    const block = profiles.slice(
      profiles.indexOf("PUBLIC_PROFILE_COLUMNS"),
      profiles.indexOf("].join")
    );
    expect(block).not.toContain('"telegram"');
    expect(block).not.toContain('"phone"');
  });
});
