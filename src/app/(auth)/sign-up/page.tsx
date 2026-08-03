"use client";

import { Chrome, Loader2, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthShell } from "@/components/auth/auth-shell";
import { SkeletonAuth } from "@/components/SkeletonAuth";
import { StatusBanner } from "@/components/StatusBanner";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { getProfileById } from "@/lib/data/profiles";
import { CURRENT_POLICY_VERSION } from "@/lib/legal/policy-version";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signInWithGoogle, signUpWithEmail } from "@/lib/supabase/auth";
import { resolvePostAuthDestination } from "@/lib/utils/auth-destination";
import { friendlySupabaseError } from "@/lib/utils/errors";
import { safeRedirect } from "@/lib/utils/safe-redirect";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function resolveDestination(uid: string, redirectTo: string) {
  const profile = await getProfileById(uid);
  return resolvePostAuthDestination(Boolean(profile?.onboardingComplete), redirectTo);
}

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, profileStatus, loading } = useAuth();
  const { t } = useLocale();
  const redirectTo = safeRedirect(searchParams.get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [bannerTone, setBannerTone] = useState<"info" | "success" | "error">("info");
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    // Wait for a definite answer: sending a signed-in user onward while their
    // profile read is still in flight resolves `onboardingComplete` to false and
    // drops a completed user into onboarding.
    if (profileStatus === "loading") return;
    router.replace(resolvePostAuthDestination(Boolean(profile?.onboardingComplete), redirectTo));
  }, [loading, profile?.onboardingComplete, profileStatus, redirectTo, router, user]);

  async function handleEmailSignUp() {
    if (!acceptedTerms) {
      setBannerTone("error");
      setBannerMessage(t("auth.mustAcceptTerms"));
      return;
    }

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
      const authResult = await signUpWithEmail(
        email.trim().toLowerCase(),
        password,
        CURRENT_POLICY_VERSION
      );

      // Branch on the SESSION, not on `user`.
      //
      // With email confirmation enabled, signUp returns the created user but NO
      // session — the account exists and cannot be used until the link is
      // clicked. Testing `user` therefore skipped the confirm-email branch and
      // fell through to resolveDestination(), which reads the profile as an
      // ANONYMOUS client and fails. That is what surfaced to every new user as
      // "You do not have permission for that action yet."
      //
      // There is also nothing to resolve without a session: the visitor cannot
      // be sent into onboarding until they can authenticate.
      if (!authResult.session || !authResult.user) {
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
    if (!acceptedTerms) {
      setBannerTone("error");
      setBannerMessage(t("auth.mustAcceptTerms"));
      return;
    }

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
        className="flex w-full items-center justify-center gap-2.5 rounded-full border border-[#e6d8c6] bg-white px-4 py-3.5 text-base font-semibold transition hover:border-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 sm:gap-3 sm:px-5 sm:py-5 sm:text-xl"
      >
        {googleLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Chrome className="h-5 w-5 text-[#db4437]" />}
        {t("auth.continueWithGoogle")}
      </button>

      <div className="my-5 flex items-center gap-3 text-sm text-[#9a6e56] sm:my-7 sm:gap-4 sm:text-base">
        <div className="h-px flex-1 bg-[#eadfce]" />
        {t("auth.or")}
        <div className="h-px flex-1 bg-[#eadfce]" />
      </div>

      <form
        className="space-y-3 sm:space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleEmailSignUp();
        }}
      >
        <div>
          <label htmlFor="email" className="text-sm font-semibold sm:text-lg">
            {t("auth.emailLabel")}
          </label>
          <div className="mt-1.5 flex items-center gap-2.5 rounded-2xl bg-[#f7f1e7] px-4 py-3 sm:mt-3 sm:gap-3 sm:rounded-[1.4rem] sm:px-5 sm:py-4">
            <Mail className="h-5 w-5 text-[#b18469]" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full bg-transparent text-base outline-none placeholder:text-[#b18469] sm:text-lg"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="text-sm font-semibold sm:text-lg">
            {t("auth.createPasswordLabel")}
          </label>
          <div className="mt-1.5 flex items-center gap-2.5 rounded-2xl bg-[#f7f1e7] px-4 py-3 sm:mt-3 sm:gap-3 sm:rounded-[1.4rem] sm:px-5 sm:py-4">
            <LockKeyhole className="h-5 w-5 text-[#b18469]" />
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder={t("auth.passwordHintPlaceholder")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-transparent text-base outline-none placeholder:text-[#b18469] sm:text-lg"
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="text-sm font-semibold sm:text-lg">
            {t("auth.confirmPasswordLabel")}
          </label>
          <div className="mt-1.5 flex items-center gap-2.5 rounded-2xl bg-[#f7f1e7] px-4 py-3 sm:mt-3 sm:gap-3 sm:rounded-[1.4rem] sm:px-5 sm:py-4">
            <LockKeyhole className="h-5 w-5 text-[#b18469]" />
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder={t("auth.reenterPasswordPlaceholder")}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full bg-transparent text-base outline-none placeholder:text-[#b18469] sm:text-lg"
            />
          </div>
        </div>

        <label
          htmlFor="acceptTerms"
          className="flex cursor-pointer items-start gap-3 rounded-2xl bg-[#f7f1e7] px-4 py-3 text-sm leading-6 sm:text-base"
        >
          <input
            id="acceptTerms"
            type="checkbox"
            required
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[#0f957d]"
          />
          <span>
            {t("auth.acceptTermsPrefix")}{" "}
            <Link href="/terms" target="_blank" className="font-semibold text-[#0f957d] underline">
              {t("auth.termsLink")}
            </Link>{" "}
            {t("auth.acceptTermsAnd")}{" "}
            <Link href="/privacy" target="_blank" className="font-semibold text-[#0f957d] underline">
              {t("auth.privacyLink")}
            </Link>
          </span>
        </label>

        <button
          type="submit"
          disabled={submitting || googleLoading || !acceptedTerms}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0f957d] px-5 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-[#0d856f] hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:px-6 sm:py-5 sm:text-xl"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          {t("auth.createAccountButton")}
        </button>
      </form>
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
