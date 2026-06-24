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

  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  const session = request.cookies.get("__session")?.value;
  const redirectPath = `${pathname}${search}`;
  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("redirect", redirectPath);

  if (!session) {
    return NextResponse.redirect(signInUrl);
  }

  const verifyUrl = new URL("/api/auth/session", request.url);
  const response = await fetch(verifyUrl, {
    headers: { cookie: `__session=${session}` }
  }).catch(() => null);

  if (!response?.ok) {
    return NextResponse.redirect(signInUrl);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const data = (await response.json()) as { role?: string | null };
    if (data.role !== "admin") {
      return NextResponse.redirect(new URL("/rooms", request.url));
    }
  }

  return NextResponse.next();
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
