"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { useAuth } from "@/context/auth-context";

// Routes inside (main) that require an authenticated, onboarded user. Everything
// else in the group (rooms, roommates, universities, and detail pages) is public
// so anonymous visitors can browse — matching the sitemap and the home CTAs.
const PROTECTED_PREFIXES = ["/profile", "/list-a-room", "/favorites", "/inbox"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const requiresAuth = isProtectedPath(pathname);

  useEffect(() => {
    if (loading || !requiresAuth) return;

    if (!user) {
      router.replace(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!profile?.onboardingComplete) {
      router.replace("/onboarding/step-1");
    }
  }, [loading, pathname, profile?.onboardingComplete, requiresAuth, router, user]);

  if (requiresAuth && (loading || !user || !profile?.onboardingComplete)) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    // overflow-x-clip prevents any stray horizontal scroll without creating a
    // scroll container, so the sticky navbar/sidebars keep working.
    <div className="min-h-screen overflow-x-clip bg-background">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
