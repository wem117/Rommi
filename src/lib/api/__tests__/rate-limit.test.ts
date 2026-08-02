import { describe, expect, it } from "vitest";

import { clientIp, clientKey, consume } from "../rate-limit";

function req(headers: Record<string, string>): Request {
  return new Request("https://roomi.kz/api/listings", { headers });
}

describe("clientIp", () => {
  it("prefers cf-connecting-ip — the only honest visitor address in production", () => {
    // Reproduces the real production chain: Cloudflare sets cf-connecting-ip to
    // the visitor, then Caddy REPLACES x-forwarded-for with the address of its
    // own peer, which is the Cloudflare edge node.
    expect(
      clientIp(
        req({
          "cf-connecting-ip": "203.0.113.10",
          "x-forwarded-for": "172.71.150.4" // Cloudflare edge, not the visitor
        })
      )
    ).toBe("203.0.113.10");
  });

  it("gives two visitors behind one Cloudflare edge distinct rate-limit keys", () => {
    // The regression this guards: keying on the Caddy-rewritten XFF put every
    // visitor sharing an edge into one bucket, so one abuser throttled everyone.
    const edge = "172.71.150.4";
    const a = clientKey(req({ "cf-connecting-ip": "203.0.113.10", "x-forwarded-for": edge }), "upload");
    const b = clientKey(req({ "cf-connecting-ip": "203.0.113.99", "x-forwarded-for": edge }), "upload");
    expect(a).not.toBe(b);
  });

  it("falls back to x-vercel-forwarded-for when Cloudflare is absent", () => {
    expect(clientIp(req({ "x-vercel-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip ahead of x-forwarded-for", () => {
    expect(clientIp(req({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "1.2.3.4" }))).toBe("203.0.113.7");
  });

  it("uses the LAST x-forwarded-for hop, never the client-controlled first hop", () => {
    // A raw XFF's leading entries are attacker-supplied; only the hop nearest
    // our own infrastructure is trustworthy.
    expect(clientIp(req({ "x-forwarded-for": "evil-spoof, 10.0.0.1, 172.71.150.4" }))).toBe("172.71.150.4");
  });

  it("returns a stable sentinel when no forwarding header is present", () => {
    expect(clientIp(req({}))).toBe("unknown");
  });
});

describe("consume (in-memory backend)", () => {
  it("allows up to the limit, then throttles", async () => {
    const key = `test:${Math.random()}`;
    expect(await consume(key, 3, 60_000)).toBe(true);
    expect(await consume(key, 3, 60_000)).toBe(true);
    expect(await consume(key, 3, 60_000)).toBe(true);
    expect(await consume(key, 3, 60_000)).toBe(false);
  });

  it("keeps separate keys independent", async () => {
    const a = `test:a:${Math.random()}`;
    const b = `test:b:${Math.random()}`;
    expect(await consume(a, 1, 60_000)).toBe(true);
    expect(await consume(a, 1, 60_000)).toBe(false);
    // b must be unaffected by a's exhaustion.
    expect(await consume(b, 1, 60_000)).toBe(true);
  });

  it("lets the window expire", async () => {
    const key = `test:window:${Math.random()}`;
    expect(await consume(key, 1, 20)).toBe(true);
    expect(await consume(key, 1, 20)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(await consume(key, 1, 20)).toBe(true);
  });
});
