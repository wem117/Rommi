"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { useAuth } from "@/context/auth-context";

// Routes inside (main) that require an authenticated, onboarded user. The bare
// list pages (/rooms, /roommates, /universities) stay public for SEO and browsing.
const PROTECTED_PREFIXES = ["/profile", "/list-a-room", "/favorites", "/inbox"];

// Detail pages: opening a specific room/roommate requires signing in, but only
// authentication — not a completed onboarding — so a fresh account can still view.
const AUTH_ONLY_DETAIL_PREFIXES = ["/rooms/", "/roommates/", "/listings/"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isAuthOnlyDetailPath(pathname: string) {
  return AUTH_ONLY_DETAIL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const requiresAuth = isProtectedPath(pathname);
  const requiresAuthOnly = isAuthOnlyDetailPath(pathname);

  useEffect(() => {
    if (loading) return;

    if (requiresAuthOnly) {
      if (!user) {
        router.replace(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
      }
      return;
    }

    if (!requiresAuth) return;

    if (!user) {
      router.replace(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!profile?.onboardingComplete) {
      router.replace("/onboarding/step-1");
    }
  }, [loading, pathname, profile?.onboardingComplete, requiresAuth, requiresAuthOnly, router, user]);

  if (requiresAuthOnly && (loading || !user)) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (requiresAuth && (loading || !user || !profile?.onboardingComplete)) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
