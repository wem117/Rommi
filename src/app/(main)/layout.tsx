"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { useAuth } from "@/context/auth-context";

// Routes inside (main) that require an authenticated, onboarded user. The list
// pages (/rooms, /roommates, /universities) AND the detail pages (/rooms/<id>,
// /roommates/<id>) are public + server-rendered for SEO. Only editing a listing
// requires auth (also enforced in middleware and server-side).
const PROTECTED_PREFIXES = ["/profile", "/list-a-room", "/favorites", "/inbox"];

function isProtectedPath(pathname: string) {
  if (PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  return pathname.startsWith("/listings/") && pathname.endsWith("/edit");
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const requiresAuth = isProtectedPath(pathname);

  useEffect(() => {
    if (loading) return;

    if (!requiresAuth) return;

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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div id="main-content">{children}</div>
      <Footer />
    </div>
  );
}
