"use client";

import { Loader2, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthShell } from "@/components/auth/auth-shell";
import { StatusBanner } from "@/components/StatusBanner";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { updatePassword } from "@/lib/supabase/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { establishRecoverySession } from "@/lib/supabase/recovery";
import { friendlySupabaseError } from "@/lib/utils/errors";

/** Only decide the link is bad AFTER the URL credentials have been processed. */
type RecoveryState = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLocale();

  const [recovery, setRecovery] = useState<RecoveryState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bannerTone, setBannerTone] = useState<"info" | "success" | "error">("info");
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Establish the recovery session from the URL before rendering any verdict.
  //
  // The old logic keyed straight off useAuth(): `!loading && !user` rendered
  // "this link is invalid or has expired". That fired for a perfectly valid link
  // because supabase-js had not (and, for an implicit link under flowType:pkce,
  // could not) turn the URL credentials into a session — so `user` was null and
  // the page blamed the link. See lib/supabase/recovery.ts for the mechanics.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setRecovery("invalid");
      return;
    }

    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    // PASSWORD_RECOVERY is emitted when supabase-js consumes the link on its
    // own (same-browser PKCE); treat it as an immediate green light.
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || session) setRecovery("ready");
    });

    void establishRecoverySession().then((ok) => {
      if (cancelled) return;
      setRecovery((current) => (current === "ready" ? current : ok ? "ready" : "invalid"));
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // An already signed-in visitor (e.g. changing their password from settings)
  // is equally entitled to the form.
  const canSetPassword = recovery === "ready" || Boolean(user);

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

      {recovery === "checking" && !canSetPassword ? (
        <div className="flex items-center justify-center gap-3 py-10 text-foreground/70" aria-busy="true">
          <Loader2 className="h-5 w-5 animate-spin" />
          {t("auth.resetHeading")}…
        </div>
      ) : !canSetPassword ? (
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
            disabled={submitting}
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
