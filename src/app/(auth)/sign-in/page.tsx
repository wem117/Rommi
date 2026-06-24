"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Chrome, Loader2, ShieldCheck, Sparkles, TimerReset } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useAuth } from "@/context/auth-context";
import { getProfileById } from "@/lib/data/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  sendResetPassword,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail
} from "@/lib/supabase/auth";

const authSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

type AuthInput = z.infer<typeof authSchema>;

const highlights = [
  { icon: ShieldCheck, title: "ID-aware trust", text: "Verified profiles and safer room discovery." },
  { icon: Sparkles, title: "Match quality", text: "Lifestyle-first roommate recommendations." },
  { icon: TimerReset, title: "Faster setup", text: "Onboarding designed to finish in minutes." }
];

async function resolveDestination(uid: string, redirectTo: string) {
  const profile = await getProfileById(uid);

  if (!profile?.onboardingComplete) {
    return "/onboarding/step-1";
  }

  return redirectTo.startsWith("/sign-in") || redirectTo.startsWith("/onboarding")
    ? "/rooms"
    : redirectTo;
}

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading } = useAuth();
  const redirectTo = searchParams.get("redirect") || "/rooms";
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<AuthInput>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "" }
  });

  useEffect(() => {
    if (loading || !user) return;
    if (!profile?.onboardingComplete) {
      router.replace("/onboarding/step-1");
      return;
    }

    router.replace(redirectTo.startsWith("/sign-in") || redirectTo.startsWith("/onboarding") ? "/rooms" : redirectTo);
  }, [loading, profile?.onboardingComplete, redirectTo, router, user]);

  async function onSubmit(values: AuthInput) {
    if (!isSupabaseConfigured) {
      toast.error("Supabase keys are missing. Add them to continue.");
      return;
    }

    try {
      const authResult =
        mode === "sign-in"
          ? await signInWithEmail(values.email, values.password)
          : await signUpWithEmail(values.email, values.password);

      if (!authResult.user) {
        toast.success("Check your email to confirm your account");
        return;
      }

      const destination = await resolveDestination(authResult.user.id, redirectTo);
      toast.success(mode === "sign-in" ? "Welcome back" : "Account created");
      router.replace(destination);
    } catch (error) {
      console.error(error);
      toast.error(mode === "sign-in" ? "Could not sign in" : "Could not create account");
    }
  }

  async function handlePasswordReset() {
    const email = document.querySelector<HTMLInputElement>("#email")?.value;
    if (!email) {
      toast.error("Enter your email first");
      return;
    }

    try {
      await sendResetPassword(email);
      toast.success("Password reset email sent");
    } catch (error) {
      console.error(error);
      toast.error("Could not send reset email");
    }
  }

  async function handleGoogle() {
    if (!isSupabaseConfigured) {
      toast.error("Supabase keys are missing. Add them to continue.");
      return;
    }

    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error(error);
      toast.error("Google sign-in failed");
      setGoogleLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[linear-gradient(180deg,#fbf8f3_0%,#f3ede3_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="rounded-[2rem] border border-white/80 bg-white/75 p-8 shadow-soft backdrop-blur">
          <Link href="/" className="inline-flex items-center gap-3 text-lg font-bold text-primary">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-white">R</span>
            Roommate KZ
          </Link>

          <div className="mt-8 max-w-xl">
            <p className="inline-flex rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Supabase-ready platform
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
              Find your perfect roommate in Kazakhstan
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-foreground/65">
              The platform now uses a modular Supabase stack, improved listing discovery, and a cleaner
              onboarding flow inspired by the reference design system.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {highlights.map((item) => (
              <article key={item.title} className="rounded-3xl bg-background/80 p-4">
                <item.icon className="h-5 w-5 text-primary" />
                <h2 className="mt-4 font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-foreground/60">{item.text}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-3xl bg-primary p-6 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Setup note</p>
            <p className="mt-3 text-sm leading-6 text-white/85">
              If sign-in is unavailable locally, add the Supabase URL, anon key, and service role key from
              `SUPABASE_MIGRATION.md`.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#eadfce] bg-white p-6 shadow-soft sm:p-8">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-normal">
              {mode === "sign-in" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-2 text-sm text-foreground/65">
              {mode === "sign-in"
                ? "Sign in to access saved listings, chats, and onboarding progress."
                : "Create an account and finish onboarding to unlock roommate matching."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || isSubmitting}
            className="mb-5 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Chrome className="h-4 w-4" />}
            Continue with Google
          </button>

          <div className="mb-5 flex items-center gap-3 text-xs text-foreground/50">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
              {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email.message}</p> : null}
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="password">Password</label>
                {mode === "sign-in" ? (
                  <button type="button" onClick={handlePasswordReset} className="text-xs font-semibold text-primary">
                    Reset password
                  </button>
                ) : null}
              </div>
              <input
                id="password"
                type="password"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                placeholder="Minimum 6 characters"
                {...register("password")}
              />
              {errors.password ? (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || googleLoading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "sign-in" ? "Sign in with email" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-foreground/65">
            {mode === "sign-in" ? "New to Roommate KZ?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="font-semibold text-primary"
              onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
            >
              {mode === "sign-in" ? "Sign up" : "Sign in"}
            </button>
          </p>

          <div className="mt-5 text-center">
            <Link href="/" className="text-xs font-medium text-foreground/50">
              Back to home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<section className="w-full rounded-2xl bg-white p-6 shadow-soft">Loading...</section>}>
      <SignInContent />
    </Suspense>
  );
}
