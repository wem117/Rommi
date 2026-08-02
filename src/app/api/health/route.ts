import { NextResponse } from "next/server";

import { supabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Readiness/liveness probe for load balancers, uptime monitors, and container
 * healthchecks. Reports process liveness plus real database reachability (a
 * cheap, unauthenticated count against a public table) so a healthy-looking
 * server with a dead DB is reported as `degraded`, not `ok`.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const START = Date.now();

export async function GET() {
  const checks: Record<string, "ok" | "degraded" | "skipped"> = {
    server: "ok",
    database: "skipped"
  };

  if (isSupabaseConfigured) {
    try {
      const res = await fetch(
        `${supabaseConfig.serverUrl}/rest/v1/site_settings?select=key&limit=1`,
        {
          headers: { apikey: supabaseConfig.anonKey, Authorization: `Bearer ${supabaseConfig.anonKey}` },
          signal: AbortSignal.timeout(3000),
          cache: "no-store"
        }
      );
      checks.database = res.ok ? "ok" : "degraded";
    } catch {
      checks.database = "degraded";
    }
  }

  const healthy = Object.values(checks).every((v) => v !== "degraded");

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      uptimeSeconds: Math.round((Date.now() - START) / 1000),
      timestamp: new Date().toISOString(),
      checks
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store, max-age=0" }
    }
  );
}
