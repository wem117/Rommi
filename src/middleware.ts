import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = [
  "/profile",
  "/list-a-room",
  "/favorites",
  "/inbox",
  "/admin",
  "/onboarding"
];

function isProtected(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  let response = NextResponse.next({ request });

  if (!isProtected(pathname)) {
    return response;
  }

  const redirectPath = `${pathname}${search}`;
  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("redirect", redirectPath);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("uid", user.id)
      .maybeSingle();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/rooms", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/profile/:path*",
    "/list-a-room/:path*",
    "/favorites",
    "/inbox/:path*",
    "/admin/:path*",
    "/onboarding/:path*"
  ]
};
