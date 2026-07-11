"use client";

import { Loader2, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AuthShell } from "@/components/auth/auth-shell";
import { StatusBanner } from "@/components/StatusBanner";
import { useAuth } from "@/context/auth-context";
import { updatePassword } from "@/lib/supabase/auth";
import { friendlySupabaseError } from "@/lib/utils/errors";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bannerTone, setBannerTone] = useState<"info" | "success" | "error">("info");
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (password.trim().length < 6) {
      setBannerTone("error");
      setBannerMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setBannerTone("error");
      setBannerMessage("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setBannerMessage(null);

    try {
      await updatePassword(password);
      toast.success("Password updated");
      router.replace("/rooms");
    } catch (error) {
      setBannerTone("error");
      setBannerMessage(friendlySupabaseError(error, "Could not update your password."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      heading="Set a new password"
      subtitle="Choose a new password for your account."
      topCtaHref="/sign-in"
      topCtaLabel="Sign In"
      footerPrompt="Remembered your password?"
      footerLinkHref="/sign-in"
      footerLinkLabel="Sign in"
    >
      <StatusBanner tone={bannerTone} message={bannerMessage} />

      {!loading && !user ? (
        <StatusBanner
          tone="error"
          message="This reset link is invalid or has expired. Request a new one from the sign-in page."
        />
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="password" className="text-lg font-semibold">
              New password
            </label>
            <div className="mt-3 flex items-center gap-3 rounded-[1.4rem] bg-[#f7f1e7] px-5 py-4">
              <LockKeyhole className="h-5 w-5 text-[#b18469]" />
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent text-lg outline-none placeholder:text-[#b18469]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="text-lg font-semibold">
              Confirm new password
            </label>
            <div className="mt-3 flex items-center gap-3 rounded-[1.4rem] bg-[#f7f1e7] px-5 py-4">
              <LockKeyhole className="h-5 w-5 text-[#b18469]" />
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full bg-transparent text-lg outline-none placeholder:text-[#b18469]"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0f957d] px-6 py-5 text-xl font-semibold text-white transition hover:bg-[#0d856f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Update Password
          </button>
        </div>
      )}
    </AuthShell>
  );
}
