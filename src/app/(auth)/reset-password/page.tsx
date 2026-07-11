"use client";

import { Loader2, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AuthShell } from "@/components/auth/auth-shell";
import { StatusBanner } from "@/components/StatusBanner";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { updatePassword } from "@/lib/supabase/auth";
import { friendlySupabaseError } from "@/lib/utils/errors";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLocale();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bannerTone, setBannerTone] = useState<"info" | "success" | "error">("info");
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  async function handleSubmit() {
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

    setSubmitting(true);
    setBannerMessage(null);

    try {
      await updatePassword(password);
      toast.success(t("auth.passwordUpdatedToast"));
      router.replace("/rooms");
    } catch (error) {
      setBannerTone("error");
      setBannerMessage(friendlySupabaseError(error, t("auth.updatePasswordFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      heading={t("auth.resetHeading")}
      subtitle={t("auth.resetSubtitle")}
      topCtaHref="/sign-in"
      topCtaLabel={t("nav.signIn")}
      footerPrompt={t("auth.rememberedPassword")}
      footerLinkHref="/sign-in"
      footerLinkLabel={t("auth.signInLink")}
    >
      <StatusBanner tone={bannerTone} message={bannerMessage} />

      {!loading && !user ? (
        <StatusBanner tone="error" message={t("auth.invalidResetLink")} />
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="password" className="text-lg font-semibold">
              {t("auth.newPasswordLabel")}
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
              {t("auth.confirmNewPasswordLabel")}
            </label>
            <div className="mt-3 flex items-center gap-3 rounded-[1.4rem] bg-[#f7f1e7] px-5 py-4">
              <LockKeyhole className="h-5 w-5 text-[#b18469]" />
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder={t("auth.reenterNewPasswordPlaceholder")}
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
            {t("auth.updatePasswordButton")}
          </button>
        </div>
      )}
    </AuthShell>
  );
}
