import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Regression cover for the "signed-in admin cannot open /admin" bug.
 *
 * ROOT CAUSE
 *   Middleware runs in the Edge runtime, and Next injects only a fixed set of
 *   variables into that sandbox — on the affected build, inspected directly from
 *   .next/server/middleware-manifest.json:
 *
 *     ["__NEXT_BUILD_ID","NEXT_SERVER_ACTIONS_ENCRYPTION_KEY",
 *      "__NEXT_PREVIEW_MODE_ID","__NEXT_PREVIEW_MODE_SIGNING_KEY",
 *      "__NEXT_PREVIEW_MODE_ENCRYPTION_KEY"]
 *
 *   `ADMIN_EMAILS` is absent, so `process.env.ADMIN_EMAILS` was undefined inside
 *   middleware regardless of the container environment. `getAllowlist()` fails
 *   closed in production, so the env allowlist evaluated to EMPTY and a real
 *   administrator was redirected to /rooms — while the identical check passed in
 *   every admin API route, which runs in Node and can read the variable.
 *
 * These are source-level assertions on purpose. The failure was invisible to
 * unit tests of the check itself (it is correct) and to typechecking; what was
 * wrong was WHERE it ran. Only the file boundary expresses that.
 */

const SRC = join(process.cwd(), "src");
const read = (p: string) => readFileSync(join(SRC, p), "utf8");

/**
 * Strips comments before asserting.
 *
 * These files DOCUMENT the removed check at length — deliberately, so the next
 * reader understands why the rule cannot live in middleware. Matching raw text
 * would fail on that explanation and pressure someone into deleting the very
 * comment that prevents the regression. Only executable code is asserted on.
 */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("admin authorization runtime boundary", () => {
  it("middleware does not read ADMIN_EMAILS — it cannot see it", () => {
    expect(code(read("middleware.ts"))).not.toContain("ADMIN_EMAILS");
  });

  it("middleware does not decide admin authorization via the env allowlist", () => {
    // `isAdminEmail` reads process.env.ADMIN_EMAILS, so importing it here would
    // reintroduce a rule whose input the Edge runtime cannot supply.
    const middleware = code(read("middleware.ts"));
    expect(middleware).not.toContain("isAdminEmail");
    expect(middleware).not.toContain("ADMIN_ROLE");
  });

  it("the admin layout DOES enforce authorization, in the Node runtime", () => {
    // This is the authoritative guard. If it ever stops calling
    // requireAdminUser(), /admin becomes reachable by any signed-in user,
    // because middleware deliberately no longer makes that decision.
    const layout = read("app/admin/layout.tsx");
    expect(layout).toContain("requireAdminUser");
  });

  it("the admin layout sends non-admins away rather than rendering", () => {
    const layout = read("app/admin/layout.tsx");
    expect(layout).toContain("redirect");
    expect(layout).toMatch(/redirect\(["'`]\/rooms/);
  });

  it("requireAdminUser still honours all three gates", () => {
    // env allowlist -> profiles.role -> admin-managed site_settings list.
    // Dropping any one of them silently strips an documented access path.
    const admin = read("lib/supabase/admin.ts");
    expect(admin).toContain("isAdminEmail");
    expect(admin).toContain("ADMIN_ROLE");
    expect(admin).toContain("admin_emails");
  });

  it("middleware still requires a session for /admin", () => {
    // Authentication is a decision middleware CAN make correctly, and removing
    // it would let unauthenticated visitors reach the admin shell before the
    // layout redirects them.
    const middleware = read("middleware.ts");
    expect(middleware).toContain("/admin");
    expect(middleware).toMatch(/isAdminPath/);
  });
});
