import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { resolvePostAuthDestination } from "@/lib/utils/auth-destination";
import { safeRedirect } from "@/lib/utils/safe-redirect";

const protectedPrefixes = [
  "/profile",
  "/list-a-room",
  "/favorites",
  "/inbox",
  "/admin",
  "/onboarding"
];

// The bare browse LIST pages (/rooms, /roommates) stay public for SEO. Opening a
// specific DETAIL page requires signing in, so these prefixes protect only the
// sub-routes (e.g. /rooms/<id>, /roommates/<id>, /listings/<id> and its /edit),
// never the bare list page itself. Server-side authorization is additionally
// enforced in each detail page via requirePageAuth().
const protectedDetailPrefixes = ["/rooms/", "/roommates/", "/listings/"];

function isProtectedDetailPath(pathname: string) {
  return protectedDetailPrefixes.some((prefix) => pathname.startsWith(prefix));
}

// Always reachable even while maintenance mode is on, so admins can sign in
// and disable it, and so auth/API calls made by the app itself keep working.
const maintenanceBypassPrefixes = ["/admin", "/api", "/sign-in", "/sign-up", "/reset-password", "/maintenance"];

function isProtected(pathname: string) {
  if (protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  // Detail pages only: /rooms/<id> is protected, /rooms (the list) is not.
  return isProtectedDetailPath(pathname);
}

// The login/register pages themselves — an already-authenticated visitor
// should never see these; they get redirected to their destination instead.
function isAuthOnlyPath(pathname: string) {
  return pathname === "/sign-in" || pathname === "/sign-up";
}

function bypassesMaintenance(pathname: string) {
  return maintenanceBypassPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

// `@supabase/ssr` names its cookie(s) "sb-<project-ref>-auth-token", chunked
// into "...-auth-token.0", "...-auth-token.1", etc. when the session is large.
// Matching on this documented, version-stable convention (rather than an exact
// name derived from env, which would break if the project ref format ever
// changes) tells us whether the browser is CLAIMING to have a session at all,
// with no network round-trip.
function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));
}

async function isMaintenanceModeOn(supabaseUrl: string, anonKey: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/site_settings?key=eq.maintenance_mode&select=value`,
      {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        // Cache briefly at the edge so maintenance mode doesn't add a Supabase
        // round-trip to every request; toggling takes up to ~30s to propagate.
        next: { revalidate: 30 },
        // Never let a slow/hung Supabase call stall navigation — fail open fast.
        signal: AbortSignal.timeout(2000)
      }
    );
    if (!res.ok) return false;
    const rows = (await res.json()) as Array<{ value: unknown }>;
    return rows[0]?.value === true;
  } catch {
    return false;
  }
}

/**
 * Resolves the current session, tolerating transient validation failures.
 *
 * `getUser()` revalidates the JWT against Supabase's Auth server on every
 * call (never trusts the cookie blindly — required so a forged/edited cookie
 * can't grant access). That network round-trip is also the one part of this
 * request that can transiently fail: a slow/hiccuping connection to the auth
 * server, or a refresh-token race between this server-side refresh and the
 * browser's own background auto-refresh, both surface here as an `error` or
 * thrown exception — NOT as proof the session is actually invalid.
 *
 * ROOT CAUSE (auth-state bugs #1/#2): previously ANY such error immediately
 * redirected to /sign-in, so an already-authenticated user occasionally got
 * bounced off a protected page (or right back to /sign-in after logging in)
 * purely because of network/timing noise, despite holding a perfectly valid
 * session. We now distinguish "no session cookie at all" (fail closed by the
 * caller, no ambiguity — checked via `hasSupabaseAuthCookie` before this is
 * even called) from "cookie present but this one validation attempt was
 * inconclusive" (`ambiguous: true` below). Callers fail OPEN on ambiguous
 * results for ordinary pages — the client-side auth guard (`useAuth()` +
 * `(main)/layout.tsx`) makes the authoritative call using its own independent
 * session read — and fail CLOSED for `/admin`, where identity truly can't be
 * assumed. This is safe because middleware here is a navigation/UX gate, not the
 * security boundary: every page and mutation is separately authorized
 * server-side via `requireSessionUser()` / `requireAdminUser()` (including
 * `src/app/admin/layout.tsx`), each performing its own fresh `getUser()` check.
 */
async function resolveSession(
  supabase: ReturnType<typeof createServerClient>
): Promise<{ user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]; ambiguous: boolean }> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { user: null, ambiguous: true };
    return { user: data.user, ambiguous: false };
  } catch {
    return { user: null, ambiguous: true };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey && !bypassesMaintenance(pathname)) {
    if (await isMaintenanceModeOn(supabaseUrl, supabaseAnonKey)) {
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }
  }

  const protectedRoute = isProtected(pathname);
  const authOnlyRoute = !protectedRoute && isAuthOnlyPath(pathname);

  if (!protectedRoute && !authOnlyRoute) {
    return response;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    if (!protectedRoute) return response; // auth-only pages just render normally without Supabase configured
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", `${pathname}${search}`);
    signInUrl.searchParams.set("error", "supabase_not_configured");
    const redirectResponse = NextResponse.redirect(signInUrl);
    redirectResponse.headers.set("Cache-Control", "no-store");
    return redirectResponse;
  }

  // No session cookie at all: auth-only pages render normally (nothing to
  // redirect away from); protected pages fail closed with no network call.
  if (!hasSupabaseAuthCookie(request)) {
    if (authOnlyRoute) return response;

    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", `${pathname}${search}`);
    const redirectResponse = NextResponse.redirect(signInUrl);
    redirectResponse.headers.set("Cache-Control", "no-store");
    return redirectResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const { user, ambiguous } = await resolveSession(supabase);

  // --- Auth-only pages (/sign-in, /sign-up): redirect away if we can CONFIRM
  // the visitor is signed in. On an ambiguous result we let the page render —
  // the client-side effect there (useAuth()) is the existing fallback and
  // this is strictly no worse than before this change.
  if (authOnlyRoute) {
    if (ambiguous || !user) return response;

    const { data: profile } = await supabase.from("profiles").select("onboarding_complete").eq("uid", user.id).maybeSingle();
    const redirectTo = safeRedirect(request.nextUrl.searchParams.get("redirect"));
    const destination = resolvePostAuthDestination(Boolean(profile?.onboarding_complete), redirectTo);

    const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
    redirectResponse.headers.set("Cache-Control", "no-store");
    return redirectResponse;
  }

  // --- Protected pages ---
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");

  if (ambiguous || !user) {
    if (isAdminPath) {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("redirect", `${pathname}${search}`);
      const redirectResponse = NextResponse.redirect(signInUrl);
      redirectResponse.headers.set("Cache-Control", "no-store");
      return redirectResponse;
    }
    // Fail open for ordinary protected pages on an ambiguous validation
    // result — see resolveSession() above for the full rationale.
    return response;
  }

  // Admin AUTHORIZATION is deliberately not decided here.
  //
  // Middleware runs in the Edge runtime, and Next only injects a fixed set of
  // variables into that sandbox — inspected on the running build, the list is
  // __NEXT_BUILD_ID, NEXT_SERVER_ACTIONS_ENCRYPTION_KEY and the preview-mode
  // keys. `ADMIN_EMAILS` is not among them, so `process.env.ADMIN_EMAILS` is
  // undefined in here no matter what the container env says.
  //
  // `getAllowlist()` fails closed in production, so the env allowlist silently
  // evaluated to EMPTY and this block redirected a genuine administrator to
  // /rooms — while the very same check passed in every admin API route, which
  // runs in Node and can read the variable. An authorization rule that depends
  // on state its runtime cannot see is not a rule, it is a coin flip.
  //
  // The authoritative guard is `requireAdminUser()` in src/app/admin/layout.tsx.
  // It runs in Node with the full environment and a service-role client, and it
  // evaluates all three gates — env allowlist, profiles.role, and the
  // admin-managed site_settings list — then redirects non-admins to /rooms
  // exactly as this block intended. Every admin API route calls it independently,
  // so data access is protected whatever a page does.
  //
  // Middleware keeps what it CAN decide correctly: that /admin requires a signed-
  // in user (handled above). Nothing here is weakened — the check that was
  // removed was strictly weaker than the one that remains, and broken besides.

  return response;
}

export const config = {
  // Skip Next internals, API routes, and any path with a file extension
  // (static assets: images, fonts, manifest, robots.txt, sitemap.xml, ...).
  matcher: ["/((?!_next/static|_next/image|api/|.*\\..*).*)"]
};
