import { NextResponse } from "next/server";

/**
 * Lightweight in-memory sliding-window rate limiter for route handlers.
 *
 * Scope & honesty: state lives per server instance. On serverless (Vercel)
 * each warm lambda keeps its own window, so the effective global limit is
 * (limit × instances) — still enough to stop naive abuse loops (report spam,
 * email enumeration) without adding infrastructure. For hard guarantees,
 * front with Vercel WAF or swap `consume` for an Upstash/Redis counter; the
 * call sites won't need to change.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function prune(now: number, windowMs: number) {
  // Opportunistic cleanup so the map can't grow unbounded on long-lived servers.
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.timestamps.every((ts) => now - ts > windowMs)) buckets.delete(key);
  }
}

/** Returns true when the caller is within the limit; false when throttled. */
export function consume(key: string, limit: number, windowMs: number): boolean {
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

/** Best-effort client identifier: first hop of x-forwarded-for, else a shared fallback. */
export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return `${scope}:${ip}`;
}

export function rateLimitResponse() {
  return NextResponse.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": "60" } }
  );
}
