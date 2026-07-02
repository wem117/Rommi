"use client";

import { Chrome, Loader2, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthShell } from "@/components/auth/auth-shell";
import { SkeletonAuth } from "@/components/SkeletonAuth";
import { StatusBanner } from "@/components/StatusBanner";
import { useAuth } from "@/context/auth-context";
import { getProfileById } from "@/lib/data/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { sendResetPassword, signInWithEmail, signInWithGoogle } from "@/lib/supabase/auth";
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

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading } = useAuth();
  const redirectTo = searchParams.get("redirect") || "/rooms";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  async function handleEmailSignIn() {
    if (!emailPattern.test(email.trim())) {
      setBannerTone("error");
      setBannerMessage("Enter a valid email address first.");
      return;
    }

    if (password.trim().length < 6) {
      setBannerTone("error");
      setBannerMessage("Enter your password to sign in.");
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
      toast.success("Welcome back");
      router.replace(destination);
    } catch (error) {
      setBannerTone("error");
      setBannerMessage(friendlySupabaseError(error, "Could not sign in."));
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
      setBannerMessage(friendlySupabaseError(error, "Google sign-in failed."));
      setGoogleLoading(false);
    }
  }

  async function handlePasswordReset() {
    if (!emailPattern.test(email.trim())) {
      setBannerTone("error");
      setBannerMessage("Enter your email before requesting a reset link.");
      return;
    }

    try {
      await sendResetPassword(email.trim().toLowerCase());
      setBannerTone("success");
      setBannerMessage("Password reset email sent. Check your inbox.");
      toast.success("Password reset email sent");
    } catch (error) {
      setBannerTone("error");
      setBannerMessage(friendlySupabaseError(error, "Could not send reset email."));
    }
  }

  return (
    <AuthShell
      heading="Welcome back"
      subtitle="Sign in with Google or your email and password."
      topCtaHref={`/sign-up${redirectTo !== "/rooms" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
      topCtaLabel="Sign Up"
      footerPrompt="Need an account?"
      footerLinkHref={`/sign-up${redirectTo !== "/rooms" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
      footerLinkLabel="Create one"
    >
      <StatusBanner tone={bannerTone} message={bannerMessage} />

      <button
        type="button"
        onClick={() => void handleGoogle()}
        disabled={googleLoading || submitting}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-[#e6d8c6] bg-white px-5 py-5 text-xl font-semibold transition hover:border-[#12b000] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {googleLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Chrome className="h-5 w-5 text-[#db4437]" />}
        Continue with Google
      </button>

      <div className="my-7 flex items-center gap-4 text-base text-[#9a6e56]">
        <div className="h-px flex-1 bg-[#eadfce]" />
        or
        <div className="h-px flex-1 bg-[#eadfce]" />
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="text-lg font-semibold">
            Email address
          </label>
          <div className="mt-3 flex items-center gap-3 rounded-[1.4rem] bg-[#f7f1e7] px-5 py-4">
            <Mail className="h-5 w-5 text-[#b18469]" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full bg-transparent text-lg outline-none placeholder:text-[#b18469]"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className="text-lg font-semibold">
              Password
            </label>
            <button
              type="button"
              onClick={() => void handlePasswordReset()}
              className="text-sm font-semibold text-[#0f957d]"
            >
              Forgot password?
            </button>
          </div>
          <div className="mt-3 rounded-[1.4rem] bg-[#f7f1e7] px-5 py-4">
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-transparent text-lg outline-none placeholder:text-[#b18469]"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleEmailSignIn()}
          disabled={submitting || googleLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0f957d] px-6 py-5 text-xl font-semibold text-white transition hover:bg-[#0d856f] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          Sign In with Email
        </button>
      </div>
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
