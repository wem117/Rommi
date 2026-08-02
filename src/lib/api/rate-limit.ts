import { NextResponse } from "next/server";

/**
 * Distributed sliding-window rate limiter for route handlers.
 *
 * Backends, in priority order:
 *   1. Upstash Redis (when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are
 *      set) — a single global window shared across every serverless instance,
 *      via the Upstash REST API. No SDK dependency: we call the REST endpoint
 *      with fetch, using INCR + EXPIRE. This is the production path and gives a
 *      real, hard global limit.
 *   2. In-memory fallback (dev, or when Redis is not configured) — per-instance
 *      window. Honest about its limits; enough to blunt naive abuse locally.
 *
 * Previously this was in-memory only, which on serverless meant the effective
 * limit was (limit x warm-instances) — i.e. no real ceiling. The Redis backend
 * closes that gap without changing any call site (they already `await`).
 */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL ?? "";
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
const redisEnabled = Boolean(REDIS_URL && REDIS_TOKEN);

// ---- In-memory fallback ----------------------------------------------------
type Bucket = { timestamps: number[] };
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function prune(now: number, windowMs: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.timestamps.every((ts) => now - ts > windowMs)) buckets.delete(key);
  }
}

function consumeMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  prune(now, windowMs);
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);
  if (bucket.timestamps.length >= limit) {
    buckets.set(key, bucket);
    return false;
  }
  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return true;
}

// ---- Upstash Redis backend (fixed-window via INCR/EXPIRE) ------------------
async function consumeRedis(key: string, limit: number, windowMs: number): Promise<boolean> {
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  // Window bucket key so the window rolls forward deterministically.
  const bucketKey = `rl:${key}:${Math.floor(Date.now() / windowMs)}`;
  try {
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([
        ["INCR", bucketKey],
        ["EXPIRE", bucketKey, String(windowSeconds)]
      ]),
      signal: AbortSignal.timeout(1500),
      cache: "no-store"
    });

    if (!res.ok) return consumeMemory(key, limit, windowMs); // fall back, not fully open
    const results = (await res.json()) as Array<{ result: number }>;
    const count = Number(results?.[0]?.result ?? 0);
    return count <= limit;
  } catch {
    // Redis unreachable: fall back to the per-instance limiter rather than
    // failing fully open.
    return consumeMemory(key, limit, windowMs);
  }
}

/** Returns true when the caller is within the limit; false when throttled. */
export async function consume(key: string, limit: number, windowMs: number): Promise<boolean> {
  return redisEnabled ? consumeRedis(key, limit, windowMs) : consumeMemory(key, limit, windowMs);
}

/**
 * Trusted client IP.
 *
 * Header order matters, and it is dictated by the deployment topology:
 *
 *     browser -> Cloudflare -> Caddy -> this app
 *
 * `cf-connecting-ip` is FIRST because it is the only header carrying the real
 * visitor address in production. Cloudflare overwrites it on every request, so a
 * client cannot forge it, and it survives the hop through Caddy untouched.
 *
 * `x-forwarded-for` is deliberately LAST and is only a fallback. Caddy replaces
 * XFF with the address of the peer it is talking to, and that peer is a
 * Cloudflare edge node — so behind Cloudflare, XFF resolves to a Cloudflare IP,
 * not the visitor. Keying limits on it collapses every visitor routed through
 * the same edge into ONE bucket: one abusive client would throttle unrelated
 * users (a self-inflicted denial of service), while per-visitor abuse went
 * uncapped. `cf-connecting-ip` restores true per-visitor accounting.
 *
 * A direct-to-origin request that bypasses Cloudflare could forge
 * `cf-connecting-ip`. That is contained by restricting inbound 80/443 to
 * Cloudflare ranges at the firewall (see ops/README.md); the header order here
 * is correct either way, because without Cloudflare there is no honest source
 * for the visitor address anyway.
 *
 * `x-vercel-forwarded-for` and `x-real-ip` are kept so the limiter still behaves
 * correctly if this app is moved to Vercel or put behind nginx — neither is set
 * by the current stack, and keeping them costs nothing.
 */
export function clientIp(request: Request): string {
  const cloudflare = request.headers.get("cf-connecting-ip");
  if (cloudflare) return cloudflare.trim();

  const vercel = request.headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();

  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();

  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const hops = fwd.split(",").map((h) => h.trim()).filter(Boolean);
    return hops[hops.length - 1] ?? "unknown";
  }
  return "unknown";
}

export function clientKey(request: Request, scope: string): string {
  return `${scope}:${clientIp(request)}`;
}

export function rateLimitResponse() {
  return NextResponse.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": "60" } }
  );
}
