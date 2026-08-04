import type { NextConfig } from "next";

/**
 * Origin of the Supabase instance this build talks to.
 *
 * The backend is self-hosted at https://api.roomi.kz, which is a DIFFERENT
 * origin from the site itself (roomi.kz) and is therefore NOT covered by
 * `'self'` in the CSP. It must be listed explicitly or the browser blocks every
 * auth, PostgREST, storage and realtime request.
 *
 * Derived from the same env var the app uses, so the policy can never drift
 * from the instance the client is actually configured to call. Falls back to
 * the production backend when the var is absent (e.g. `next lint` outside CI).
 */
const SUPABASE_ORIGIN = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return "https://api.roomi.kz";
  try {
    return new URL(raw).origin;
  } catch {
    return "https://api.roomi.kz";
  }
})();

/** Same origin as a websocket scheme, for Supabase Realtime. */
const SUPABASE_WS_ORIGIN = SUPABASE_ORIGIN.replace(/^http/, "ws");

/**
 * Content-Security-Policy.
 *
 * Allows exactly the origins this app talks to and nothing else:
 *   • the self-hosted Supabase instance (auth, PostgREST, storage) over https,
 *     and Realtime over wss
 *   • Google Maps JS + tiles, and OpenStreetMap/Nominatim (the Leaflet fallback)
 *   • Google Analytics / Tag Manager (only active when an admin sets a GA id)
 *   • self-hosted next/font assets and Next's inline bootstrap
 *
 * `script-src` keeps 'unsafe-inline' because Next injects inline hydration
 * scripts and the app renders inline JSON-LD + the GA snippet. A stricter
 * nonce-based policy is the next iteration (requires per-request nonce plumbing
 * through middleware); this is already a large improvement over having no CSP.
 * 'unsafe-eval' is intentionally omitted in production.
 *
 * Google Analytics / Tag Manager domains are WILDCARDED (`*.google-analytics.com`,
 * `*.googletagmanager.com`, `*.analytics.google.com`), matching Google's own
 * documented CSP recommendation for gtag.js. This previously allow-listed only
 * the exact host `www.google-analytics.com`, but gtag.js frequently sends its
 * actual hit to a REGIONAL collect endpoint (e.g. `region1.google-analytics.com`)
 * or `analytics.google.com` depending on the visitor's location/consent state.
 * With the narrower policy the tag script loaded fine (script-src matched) but
 * every collect request was silently blocked by connect-src — the exact failure
 * mode behind "Google tag not detected": the tag never actually reaches Google.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://*.googletagmanager.com https://*.google-analytics.com https://maps.googleapis.com",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${SUPABASE_ORIGIN} https://images.unsplash.com https://lh3.googleusercontent.com https://*.tile.openstreetmap.org https://maps.googleapis.com https://maps.gstatic.com https://*.gstatic.com https://*.googleapis.com https://*.google-analytics.com https://*.googletagmanager.com`,
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WS_ORIGIN} https://nominatim.openstreetmap.org https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://maps.googleapis.com https://*.tile.openstreetmap.org`,
  "frame-src 'self' https://*.google.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests"
].join("; ");

/** Baseline security headers applied to every response. */
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), interest-cohort=(), browsing-topics=()"
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload"
  }
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Emit a minimal standalone server bundle for slim production Docker images.
  output: "standalone",
  outputFileTracingRoot: __dirname,
  // Surface server errors to the instrumentation hook (src/instrumentation.ts).
  experimental: {
    // Keep large map/vendor chunks out of the main bundle where possible.
    optimizePackageImports: ["lucide-react", "date-fns"]
  },
  images: {
    // The self-hosted Supabase host serves every uploaded avatar/listing/message
    // image from /storage/v1/object/public/..., so it must be allow-listed or
    // next/image refuses to optimize them and the images fail to render.
    remotePatterns: [
      { protocol: "https", hostname: new URL(SUPABASE_ORIGIN).hostname },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" }
    ],
    // 75 is the default; 90 is used by the fullscreen gallery lightbox.
    qualities: [75, 90]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      },
      {
        // HTML documents only — never the build-hashed /_next/static assets
        // (which must stay `immutable`) and never API routes (which set their
        // own caching).
        //
        // Next serves prerendered pages with `s-maxage=31536000` /
        // `stale-while-revalidate=31535880`, so a shared cache (CDN, reverse
        // proxy) may keep a page's HTML for up to a year. After a redeploy the
        // build-hashed CSS/JS that HTML references no longer exists, so the
        // stale HTML requests `/_next/static/css/<old-hash>.css`, gets a 404,
        // and the page renders as completely unstyled HTML.
        //
        // Forcing revalidation keeps HTML and assets in lockstep. The origin's
        // own ISR cache still serves the page instantly, and conditional
        // requests answer with cheap 304s, so this costs a round-trip, not a
        // re-render.
        source: "/((?!_next/static|_next/image|api/).*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }]
      }
    ];
  }
};

export default nextConfig;
