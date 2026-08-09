import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Security headers are owned by ONE layer: next.config.ts.
 *
 * deploy/Caddyfile deliberately omits them for the roomi.kz site and sets them
 * only for api.roomi.kz, which Next never serves. That pairing is the whole
 * design — and it is exactly what drifted in production, where the live
 * /etc/caddy/Caddyfile still carried its own copy and every response came back
 * with two Strict-Transport-Security values (31536000 and 63072000), two
 * Referrer-Policy, two X-Content-Type-Options and two X-Frame-Options.
 *
 * These assertions pin the CONTRACT rather than the current strings: each
 * header must be defined exactly once in the owning layer, the proxy config must
 * not re-add them to the site Next serves, and it must still cover the gateway
 * Next does not.
 */
const ROOT = process.cwd();
const nextConfigRaw = readFileSync(join(ROOT, "next.config.ts"), "utf8");
const caddyfile = readFileSync(join(ROOT, "deploy", "Caddyfile"), "utf8");

const nextConfig = nextConfigRaw;

/**
 * The CSP value itself, sliced out of the file.
 *
 * Asserting against the whole file is wrong in both directions. The prose above
 * the policy discusses directives it deliberately does NOT set — "'unsafe-eval'
 * is intentionally omitted in production" — so a substring search reports an
 * absent directive as present. And stripping `//` comments to compensate eats
 * `https://` inside the policy's own host list, deleting the directives under
 * test. Slice the value; assert on the value.
 */
const cspValue = (() => {
  const start = nextConfigRaw.indexOf("const csp");
  const end = nextConfigRaw.indexOf("const securityHeaders");
  if (start === -1 || end === -1 || end < start) throw new Error("could not locate the CSP in next.config.ts");
  return nextConfigRaw.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, "");
})();

const OWNED = [
  "Strict-Transport-Security",
  "Referrer-Policy",
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Content-Security-Policy"
];

/** The Caddy site block that fronts the Next app. */
function roomiSiteBlock(src: string): string {
  const start = src.indexOf("roomi.kz");
  const apiStart = src.indexOf("api.roomi.kz");
  // The api block is a separate site; isolate whichever comes first.
  return apiStart > start ? src.slice(start, apiStart) : src.slice(start);
}

describe("security header ownership", () => {
  it("next.config.ts defines each owned header exactly once", () => {
    for (const header of OWNED) {
      const count = nextConfig.split(`"${header}"`).length - 1;
      expect(count, `${header} defined ${count}x in next.config.ts`).toBe(1);
    }
  });

  it("the proxy does not re-add headers to the site Next already serves", () => {
    // Two layers setting the same header is how production ended up shipping
    // two conflicting HSTS max-age values.
    const block = roomiSiteBlock(caddyfile);
    for (const header of OWNED) {
      expect(block, `deploy/Caddyfile re-adds ${header} to the roomi.kz site`).not.toContain(header);
    }
  });

  it("the proxy still protects api.roomi.kz, which Next never serves", () => {
    // Found bare in production: no HSTS, no nosniff, nothing. Next cannot cover
    // it, so the proxy must.
    const apiBlock = caddyfile.slice(caddyfile.indexOf("api.roomi.kz"));
    expect(apiBlock).toContain("Strict-Transport-Security");
    expect(apiBlock).toContain("X-Content-Type-Options");
    expect(apiBlock).toContain("X-Frame-Options");
  });

  it("HSTS is stated once, with a single max-age", () => {
    const values = [...nextConfig.matchAll(/max-age=(\d+); includeSubDomains/g)].map((m) => m[1]);
    expect(new Set(values).size, `conflicting HSTS max-age values: ${values.join(", ")}`).toBeLessThanOrEqual(1);
  });

  it("clickjacking is denied by both mechanisms, and they agree", () => {
    // X-Frame-Options for legacy agents, frame-ancestors for modern ones. A
    // DENY paired with a permissive frame-ancestors would silently be the
    // weaker of the two on any current browser.
    expect(nextConfig).toContain('{ key: "X-Frame-Options", value: "DENY" }');
    expect(cspValue).toMatch(/frame-ancestors 'none'/);
  });

  it("the CSP keeps the directives that do not depend on inline scripts", () => {
    // script-src still needs 'unsafe-inline' (Next's streaming bootstrap; a
    // nonce would opt / and /roommates out of static rendering). These are the
    // directives that hold regardless.
    expect(cspValue).toMatch(/default-src 'self'/);
    expect(cspValue).toMatch(/object-src 'none'/);
    expect(cspValue).toMatch(/base-uri 'self'/);
    expect(cspValue).toMatch(/form-action 'self'/);
  });

  it("never allows unsafe-eval", () => {
    // 'unsafe-inline' is a documented, load-bearing exception. 'unsafe-eval' is
    // not, and nothing in this app needs it.
    expect(cspValue).not.toContain("unsafe-eval");
  });

  it("adds no CORS grant anywhere — deny by default", () => {
    expect(nextConfig).not.toContain("Access-Control-Allow-Origin");
    expect(caddyfile).not.toContain("Access-Control-Allow-Origin");
  });
});
