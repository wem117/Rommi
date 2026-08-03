import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Regression cover for "signed-in users are bounced off /admin and every
 * auth-gated page".
 *
 * ROOT CAUSE
 *   supabase-js derives the auth cookie name from the URL the client is built
 *   with. Verified in the shipped production bundle:
 *
 *     let h = `sb-${g.hostname.split(".")[0]}-auth-token`;
 *
 *   The browser authenticates against https://api.roomi.kz and is issued
 *   `sb-api-auth-token`. Building the COOKIE-READING server client with the
 *   internal origin http://kong:8000 made it look for `sb-kong-auth-token`,
 *   which nothing sets — so every server-side session read came back empty.
 *
 *   It failed silently and looked like an auth bug rather than a config bug,
 *   because middleware builds its own client directly from
 *   NEXT_PUBLIC_SUPABASE_URL, still found the session, and let the request
 *   through to a layout that then rejected it.
 */

const SRC = join(process.cwd(), "src");
const read = (p: string) => readFileSync(join(SRC, p), "utf8");

/** Strips comments so the explanation of the rule cannot satisfy the rule. */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Mirrors supabase-js: sb-${hostname.split(".")[0]}-auth-token */
function cookieNameFor(url: string): string {
  return `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
}

describe("auth cookie origin", () => {
  it("public and internal origins yield DIFFERENT cookie names", () => {
    // The whole reason the cookie-reading client cannot use the internal origin.
    expect(cookieNameFor("https://api.roomi.kz")).toBe("sb-api-auth-token");
    expect(cookieNameFor("http://kong:8000")).toBe("sb-kong-auth-token");
    expect(cookieNameFor("https://api.roomi.kz")).not.toBe(cookieNameFor("http://kong:8000"));
  });

  it("the cookie-reading server client is built from the PUBLIC url", () => {
    const server = code(read("lib/supabase/server.ts"));
    expect(server).toMatch(/createServerClient\(\s*supabaseConfig\.url\s*,/);
    expect(server).not.toMatch(/createServerClient\(\s*supabaseConfig\.serverUrl\s*,/);
  });

  it("cookieless clients keep the internal origin, so the latency win is retained", () => {
    // Service-role client: no cookies, persistSession false.
    expect(code(read("lib/supabase/server.ts"))).toMatch(
      /createClient\(\s*supabaseConfig\.serverUrl\s*,\s*requireServiceRoleKey\(\)/
    );
    // Anon public server client: no cookies either.
    expect(code(read("lib/supabase/public-server-client.ts"))).toMatch(
      /createClient\(\s*supabaseConfig\.serverUrl\s*,/
    );
  });

  it("middleware builds its client from the public env var, matching the browser", () => {
    const middleware = code(read("middleware.ts"));
    expect(middleware).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(middleware).not.toContain("serverUrl");
  });
});
