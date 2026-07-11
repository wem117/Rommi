"use client";

import { Chrome, Loader2, LockKeyhole, Mail } from "lucide-react";
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
import { signInWithGoogle, signUpWithEmail } from "@/lib/supabase/auth";
import { friendlySupabaseError } from "@/lib/utils/errors";

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

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading } = useAuth();
  const { t } = useLocale();
  const redirectTo = searchParams.get("redirect") || "/rooms";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [bannerTone, setBannerTone] = useState<"info" | "success" | "error">("info");
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

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

  async function handleEmailSignUp() {
    if (!emailPattern.test(email.trim())) {
      setBannerTone("error");
      setBannerMessage(t("auth.invalidEmail"));
      return;
    }

    if (password.trim().length < 6) {
      setBannerTone("error");
      setBannerMessage(t("auth.passwordTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      setBannerTone("error");
      setBannerMessage(t("auth.passwordsDontMatch"));
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
      const authResult = await signUpWithEmail(email.trim().toLowerCase(), password);

      if (!authResult.user) {
        setBannerTone("success");
        setBannerMessage(t("auth.confirmEmailBanner"));
        toast.success(t("auth.confirmEmailToast"));
        return;
      }

      const destination = await resolveDestination(authResult.user.id, redirectTo);
      toast.success(t("auth.accountCreatedToast"));
      router.replace(destination);
    } catch (error) {
      setBannerTone("error");
      setBannerMessage(friendlySupabaseError(error, t("auth.signUpFailed")));
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
      setBannerMessage(friendlySupabaseError(error, t("auth.googleSignUpFailed")));
      setGoogleLoading(false);
    }
  }

  return (
    <AuthShell
      heading={t("auth.signUpHeading")}
      subtitle={t("auth.signUpSubtitle")}
      topCtaHref={`/sign-in${redirectTo !== "/rooms" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
      topCtaLabel={t("nav.signIn")}
      footerPrompt={t("auth.haveAccount")}
      footerLinkHref={`/sign-in${redirectTo !== "/rooms" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
      footerLinkLabel={t("auth.signInLink")}
    >
      <StatusBanner tone={bannerTone} message={bannerMessage} />

      <button
        type="button"
        onClick={() => void handleGoogle()}
        disabled={googleLoading || submitting}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-[#e6d8c6] bg-white px-5 py-5 text-xl font-semibold transition hover:border-[#12b000] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {googleLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Chrome className="h-5 w-5 text-[#db4437]" />}
        {t("auth.continueWithGoogle")}
      </button>

      <div className="my-7 flex items-center gap-4 text-base text-[#9a6e56]">
        <div className="h-px flex-1 bg-[#eadfce]" />
        {t("auth.or")}
        <div className="h-px flex-1 bg-[#eadfce]" />
      </div>

      <div className="space-y-4">
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
          <label htmlFor="password" className="text-lg font-semibold">
            {t("auth.createPasswordLabel")}
          </label>
          <div className="mt-3 flex items-center gap-3 rounded-[1.4rem] bg-[#f7f1e7] px-5 py-4">
            <LockKeyhole className="h-5 w-5 text-[#b18469]" />
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder={t("auth.passwordHintPlaceholder")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-transparent text-lg outline-none placeholder:text-[#b18469]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="text-lg font-semibold">
            {t("auth.confirmPasswordLabel")}
          </label>
          <div className="mt-3 flex items-center gap-3 rounded-[1.4rem] bg-[#f7f1e7] px-5 py-4">
            <LockKeyhole className="h-5 w-5 text-[#b18469]" />
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder={t("auth.reenterPasswordPlaceholder")}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full bg-transparent text-lg outline-none placeholder:text-[#b18469]"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleEmailSignUp()}
          disabled={submitting || googleLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0f957d] px-6 py-5 text-xl font-semibold text-white transition hover:bg-[#0d856f] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          {t("auth.createAccountButton")}
        </button>
      </div>
    </AuthShell>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<SkeletonAuth />}>
      <SignUpContent />
    </Suspense>
  );
}
