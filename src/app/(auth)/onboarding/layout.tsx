"use client";

import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const { t } = useLocale();
  const steps = [
    { href: "/onboarding/step-1", label: t("onboarding.stepBasicsLabel") },
    { href: "/onboarding/step-2", label: t("onboarding.stepHousingLabel") },
    { href: "/onboarding/step-3", label: t("onboarding.stepLifestyleLabel") }
  ];
  const activeIndex = Math.max(
    steps.findIndex((step) => pathname.endsWith(step.href)),
    0
  );

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (profile?.onboardingComplete) {
      router.replace("/rooms");
    }
  }, [loading, pathname, profile?.onboardingComplete, router, user]);

  if (loading || !user || profile?.onboardingComplete) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <p className="mb-5 text-center text-2xl font-bold text-foreground">
          Room<span className="text-primary">i</span>
        </p>
        <div className="w-full rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-8">
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.href} className="flex flex-1 items-center last:flex-none">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-300 ${
                      index <= activeIndex ? "bg-primary text-white" : "bg-background text-foreground/50"
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < steps.length - 1 ? (
                    <div
                      className={`mx-3 h-1 flex-1 rounded-full transition-colors duration-500 ${
                        index < activeIndex ? "bg-primary" : "bg-background"
                      }`}
                    />
                  ) : null}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 text-center text-xs font-medium text-foreground/60">
              {steps.map((step) => (
                <span key={step.href}>{step.label}</span>
              ))}
            </div>
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
