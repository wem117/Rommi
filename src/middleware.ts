import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isAdminEmail } from "@/lib/auth/admin-access";

const protectedPrefixes = [
  "/profile",
  "/list-a-room",
  "/favorites",
  "/inbox",
  "/admin",
  "/onboarding"
];

// Browse list pages (/rooms, /roommates) stay public for SEO, but opening a
// specific detail page requires signing in. These prefixes protect only the
// sub-routes (e.g. /rooms/<id>), never the bare list page itself.
const protectedDetailPrefixes = ["/rooms", "/roommates", "/listings"];

// Always reachable even while maintenance mode is on, so admins can sign in
// and disable it, and so auth/API calls made by the app itself keep working.
const maintenanceBypassPrefixes = ["/admin", "/api", "/sign-in", "/sign-up", "/reset-password", "/maintenance"];

function isProtected(pathname: string) {
  if (protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  // Detail pages only: /rooms/<id> is protected, /rooms is not.
  return protectedDetailPrefixes.some((prefix) => pathname.startsWith(`${prefix}/`));
}

function bypassesMaintenance(pathname: string) {
  return maintenanceBypassPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

async function isMaintenanceModeOn(supabaseUrl: string, anonKey: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/site_settings?key=eq.maintenance_mode&select=value`,
      {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        // Cache briefly at the edge so maintenance mode doesn't add a Supabase
        // round-trip to every request; toggling takes up to ~30s to propagate.
        next: { revalidate: 30 }
      }
    );
    if (!res.ok) return false;
    const rows = (await res.json()) as Array<{ value: unknown }>;
    return rows[0]?.value === true;
  } catch {
    return false;
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

  if (!isProtected(pathname)) {
    return response;
  }

  const redirectPath = `${pathname}${search}`;
  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("redirect", redirectPath);

  if (!supabaseUrl || !supabaseAnonKey) {
    signInUrl.searchParams.set("error", "supabase_not_configured");
    return NextResponse.redirect(signInUrl);
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

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.redirect(signInUrl);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!isAdminEmail(user.email)) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("uid", user.id).maybeSingle();

      if (profile?.role !== "admin") {
        // RLS only lets a signed-in user read this row when their own email
        // is inside admin_emails, so a non-empty result confirms access.
        const { data: setting } = await supabase
          .from("site_settings")
          .select("key")
          .eq("key", "admin_emails")
          .maybeSingle();

        if (!setting) {
          return NextResponse.redirect(new URL("/rooms", request.url));
        }
      }
    }
  }

  return response;
}

export const config = {
  // Skip Next internals, API routes, and any path with a file extension
  // (static assets: images, fonts, manifest, robots.txt, sitemap.xml, ...).
  matcher: ["/((?!_next/static|_next/image|api/|.*\\..*).*)"]
};
