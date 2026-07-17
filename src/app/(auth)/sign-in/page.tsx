"use client";

import { Chrome, Loader2, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthShell } from "@/components/auth/auth-shell";
import { SkeletonAuth } from "@/components/SkeletonAuth";
import { StatusBanner } from "@/components/StatusBanner";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { getProfileById } from "@/lib/data/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { sendResetPassword, signInWithEmail, signInWithGoogle } from "@/lib/supabase/auth";
import { friendlySupabaseError } from "@/lib/utils/errors";
import { safeRedirect } from "@/lib/utils/safe-redirect";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function resolveDestination(uid: string, redirectTo: string) {
  const profile = await getProfileById(uid);

  if (!profile?.onboardingComplete) {
    return "/onboarding/step-1";
  }

  return redirectTo.startsWith("/sign-in") || redirectTo.startsWith("/sign-up") || redirectTo.startsWith("/onboarding")
    ? "/rooms"
    : redirectTo;
}

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading } = useAuth();
  const { t } = useLocale();
  const redirectTo = safeRedirect(searchParams.get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [bannerTone, setBannerTone] = useState<"info" | "success" | "error">("info");
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Surface errors handed back by the OAuth / password-recovery callback so a
  // failed code exchange isn't silent.
  useEffect(() => {
    const authError = searchParams.get("error");
    if (!authError) return;
    setBannerTone("error");
    setBannerMessage(
      authError === "supabase_not_configured"
        ? "Authentication isn't configured yet. Please try again later."
        : t("auth.invalidResetLink")
    );
  }, [searchParams, t]);

  useEffect(() => {
    if (loading || !user) return;

    if (!profile?.onboardingComplete) {
      router.replace("/onboarding/step-1");
      return;
    }

    router.replace(
      redirectTo.startsWith("/sign-in") || redirectTo.startsWith("/sign-up") || redirectTo.startsWith("/onboarding")
        ? "/rooms"
        : redirectTo
    );
  }, [loading, profile?.onboardingComplete, redirectTo, router, user]);

  async function handleEmailSignIn() {
    if (!emailPattern.test(email.trim())) {
      setBannerTone("error");
      setBannerMessage(t("auth.invalidEmail"));
      return;
    }

    if (password.trim().length < 6) {
      setBannerTone("error");
      setBannerMessage(t("auth.enterPassword"));
      return;
    }

    if (!isSupabaseConfigured) {
      setBannerTone("error");
      setBannerMessage("Supabase keys are missing. Add them to .env.local before using auth.");
      return;
    }

    setSubmitting(true);
    setBannerMessage(null);

    try {
      const authResult = await signInWithEmail(email.trim().toLowerCase(), password);
      const destination = authResult.user ? await resolveDestination(authResult.user.id, redirectTo) : "/rooms";
      toast.success(t("auth.welcomeBackToast"));
      router.replace(destination);
    } catch (error) {
      setBannerTone("error");
      setBannerMessage(friendlySupabaseError(error, t("auth.signInFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    if (!isSupabaseConfigured) {
      setBannerTone("error");
      setBannerMessage("Supabase keys are missing. Add them to .env.local before using auth.");
      return;
    }

    setGoogleLoading(true);
    setBannerMessage(null);

    try {
      await signInWithGoogle(redirectTo);
    } catch (error) {
      setBannerTone("error");
      setBannerMessage(friendlySupabaseError(error, t("auth.googleSignInFailed")));
      setGoogleLoading(false);
    }
  }

  async function handlePasswordReset() {
    if (!emailPattern.test(email.trim())) {
      setBannerTone("error");
      setBannerMessage(t("auth.enterEmailForReset"));
      return;
    }

    if (!isSupabaseConfigured) {
      setBannerTone("error");
      setBannerMessage("Supabase keys are missing. Add them to .env.local before using auth.");
      return;
    }

    setSubmitting(true);
    setBannerMessage(null);
    try {
      await sendResetPassword(email.trim().toLowerCase());
      setBannerTone("success");
      setBannerMessage(t("auth.resetEmailSentBanner"));
      toast.success(t("auth.resetEmailSentToast"));
    } catch (error) {
      // Surface the raw error for diagnosis; the UI shows a friendly mapping.
      console.error("Password reset request failed", error);
      setBannerTone("error");
      setBannerMessage(friendlySupabaseError(error, t("auth.resetEmailFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      heading={t("auth.signInHeading")}
      subtitle={t("auth.signInSubtitle")}
      topCtaHref={`/sign-up${redirectTo !== "/rooms" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
      topCtaLabel={t("nav.signUp")}
      footerPrompt={t("auth.needAccount")}
      footerLinkHref={`/sign-up${redirectTo !== "/rooms" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
      footerLinkLabel={t("auth.createOne")}
    >
      <StatusBanner tone={bannerTone} message={bannerMessage} />

      <button
        type="button"
        onClick={() => void handleGoogle()}
        disabled={googleLoading || submitting}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-[#e6d8c6] bg-white px-5 py-5 text-xl font-semibold transition hover:border-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
      >
        {googleLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Chrome className="h-5 w-5 text-[#db4437]" />}
        {t("auth.continueWithGoogle")}
      </button>

      <div className="my-7 flex items-center gap-4 text-base text-[#9a6e56]">
        <div className="h-px flex-1 bg-[#eadfce]" />
        {t("auth.or")}
        <div className="h-px flex-1 bg-[#eadfce]" />
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleEmailSignIn();
        }}
      >
        <div>
          <label htmlFor="email" className="text-lg font-semibold">
            {t("auth.emailLabel")}
          </label>
          <div className="mt-3 flex items-center gap-3 rounded-[1.4rem] bg-[#f7f1e7] px-5 py-4">
            <Mail className="h-5 w-5 text-[#b18469]" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full bg-transparent text-lg outline-none placeholder:text-[#b18469]"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className="text-lg font-semibold">
              {t("auth.passwordLabel")}
            </label>
            <button
              type="button"
              onClick={() => void handlePasswordReset()}
              disabled={submitting || googleLoading}
              className="text-sm font-semibold text-[#0f957d] transition disabled:opacity-50"
            >
              {t("auth.forgotPassword")}
            </button>
          </div>
          <div className="mt-3 rounded-[1.4rem] bg-[#f7f1e7] px-5 py-4">
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-transparent text-lg outline-none placeholder:text-[#b18469]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || googleLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0f957d] px-6 py-5 text-xl font-semibold text-white shadow-md transition hover:bg-[#0d856f] hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          {t("auth.signInButton")}
        </button>
      </form>
    </AuthShell>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SkeletonAuth />}>
      <SignInContent />
    </Suspense>
  );
}
