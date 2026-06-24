"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Chrome, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { doc, getDoc } from "firebase/firestore";

import { converter } from "@/lib/firebase/firestore";
import type { UserProfile } from "@/types/user";

const authSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

type AuthInput = z.infer<typeof authSchema>;

async function establishSessionAndDestination(uid: string, redirectTo: string) {
  const { auth, db } = await import("@/lib/firebase/client");
  const user = auth.currentUser;
  if (!user) throw new Error("Missing authenticated user");

  const idToken = await user.getIdToken();
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });

  if (!response.ok) {
    throw new Error("Could not create secure session");
  }

  const profileRef = doc(db, "users", uid).withConverter(converter<UserProfile>());
  const profileSnap = await getDoc(profileRef);

  if (!profileSnap.exists() || !profileSnap.data().onboardingComplete) {
    return "/onboarding/step-1";
  }

  return redirectTo.startsWith("/sign-in") || redirectTo.startsWith("/onboarding")
    ? "/rooms"
    : redirectTo;
}

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  async function completeAuth(uid: string) {
    const destination = await establishSessionAndDestination(uid, redirectTo);
    toast.success(mode === "sign-in" ? "Welcome back" : "Account created");
    router.replace(destination);
  }

  async function onSubmit(values: AuthInput) {
    try {
      const { signInWithEmail, signUpWithEmail } = await import("@/lib/firebase/auth");
      const credential =
        mode === "sign-in"
          ? await signInWithEmail(values.email, values.password)
          : await signUpWithEmail(values.email, values.password);
      await completeAuth(credential.user.uid);
    } catch (error) {
      console.error(error);
      toast.error(mode === "sign-in" ? "Could not sign in" : "Could not create account");
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const { signInWithGoogle } = await import("@/lib/firebase/auth");
      const credential = await signInWithGoogle();
      await completeAuth(credential.user.uid);
    } catch (error) {
      console.error(error);
      toast.error("Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <section className="w-full rounded-2xl bg-white p-6 shadow-soft">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-normal">Welcome back</h1>
        <p className="mt-2 text-sm text-foreground/65">Sign in to access your account</p>
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
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email.message}</p> : null}
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
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
          {mode === "sign-in" ? "Sign In" : "Create Account"}
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
  );
}
