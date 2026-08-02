"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { useAuth } from "@/context/auth-context";
import { canEnterProtectedPage, needsOnboarding } from "@/lib/utils/onboarding-gate";

// The browse LIST pages (/rooms, /roommates, /universities) stay public for SEO.
// These prefixes require an authenticated, onboarded user.
const PROTECTED_PREFIXES = ["/profile", "/list-a-room", "/favorites", "/inbox"];

// DETAIL pages: opening a specific room/roommate requires signing in, but only
// authentication — not completed onboarding — so a fresh account can still view.
const AUTH_ONLY_DETAIL_PREFIXES = ["/rooms/", "/roommates/", "/listings/"];

function isEditPath(pathname: string) {
  return pathname.startsWith("/listings/") && pathname.endsWith("/edit");
}

function isProtectedPath(pathname: string) {
  if (PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  return isEditPath(pathname);
}

function isAuthOnlyDetailPath(pathname: string) {
  // Editing a listing needs full onboarding, so it's handled by isProtectedPath.
  if (isEditPath(pathname)) return false;
  return AUTH_ONLY_DETAIL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, profileStatus, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const requiresAuth = isProtectedPath(pathname);
  const requiresAuthOnly = isAuthOnlyDetailPath(pathname);

  useEffect(() => {
    if (loading) return;

    // Detail pages: authentication only. A guest is sent to sign-in with a
    // return URL so they come back to this exact page afterwards.
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

    // Only on positive evidence that onboarding is unfinished. A profile that
    // is still loading, or whose read failed, says nothing — see
    // lib/utils/onboarding-gate.ts for the loop this prevents.
    if (needsOnboarding(profileStatus, profile)) {
      router.replace("/onboarding/step-1");
    }
  }, [loading, pathname, profile, profileStatus, requiresAuth, requiresAuthOnly, router, user]);

  if (requiresAuthOnly && (loading || !user)) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (requiresAuth && (loading || !user || !canEnterProtectedPage(profileStatus, profile))) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div id="main-content">{children}</div>
      <Footer />
    </div>
  );
}
