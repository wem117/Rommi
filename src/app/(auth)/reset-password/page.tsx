"use client";

import { KeyRound, Loader2, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthShell } from "@/components/auth/auth-shell";
import { StatusBanner } from "@/components/StatusBanner";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { updatePassword } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { RECOVERY_CODE_LENGTH, establishRecoverySession, verifyRecoveryCode } from "@/lib/supabase/recovery";
import { friendlySupabaseError } from "@/lib/utils/errors";

/**
 * "checking" — redeeming whatever the recovery URL carried.
 * "code"     — no working link credential; the user enters the emailed code.
 * "form"     — a recovery session exists; collect the new password.
 *
 * A failed link never dead-ends here. It falls through to "code", because the
 * same email carries a 6-digit code that no mail client, scanning proxy or
 * in-app webview can interfere with.
 */
type Phase = "checking" | "code" | "form";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLocale();

  const [phase, setPhase] = useState<Phase>("checking");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bannerTone, setBannerTone] = useState<"info" | "success" | "error">("info");
  // Held as a translation KEY (or, for messages that come back from Supabase,
  // literal text) and resolved at render. Storing the translated string instead
  // froze it in whichever locale happened to be active when it was set — on
  // first mount that is the default, before locale-context has read the user's
  // stored choice, so an English user saw a Russian banner.
  const [banner, setBanner] = useState<{ key: string } | { text: string } | null>(null);
  const bannerMessage = banner === null ? null : "key" in banner ? t(banner.key) : banner.text;

  // Redeem the URL credential before rendering any verdict. Deciding from
  // useAuth() alone was the original defect: `!loading && !user` rendered "this
  // link is invalid or has expired" while the credential in the URL had not been
  // redeemed yet — blaming the link for the page's own timing.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setPhase("code");
      return;
    }

    let cancelled = false;

    void establishRecoverySession().then((outcome) => {
      if (cancelled) return;

      if (outcome.status === "authenticated") {
        setPhase("form");
        return;
      }

      if (outcome.email) setEmail(outcome.email);

      if (outcome.status === "failed") {
        setBannerTone("error");
        setBanner({ key: "auth.resetLinkFailedUseCode" });
      }

      setPhase("code");
    });

    return () => {
      cancelled = true;
    };
    // Runs exactly once. Recovery credentials are single-use, so re-running this
    // on any re-render would re-POST a token that has already been consumed and
    // report a failure that never happened — which is why the banner stores a
    // translation key rather than translated text, keeping `t` out of here.
  }, []);

  // An already signed-in visitor (changing their password from settings) is
  // equally entitled to the form.
  const showPasswordForm = phase === "form" || Boolean(user);

  async function handleVerifyCode() {
    const digits = code.replace(/\D/g, "");

    if (!email.trim()) {
      setBannerTone("error");
      setBanner({ key: "auth.enterEmailForReset" });
      return;
    }

    if (digits.length !== RECOVERY_CODE_LENGTH) {
      setBannerTone("error");
      setBanner({ key: "auth.resetCodeWrongLength" });
      return;
    }

    setVerifyingCode(true);
    setBanner(null);

    try {
      await verifyRecoveryCode(email, digits);
      setPhase("form");
    } catch (error) {
      setBannerTone("error");
      setBanner({ text: friendlySupabaseError(error, t("auth.resetCodeInvalid")) });
    } finally {
      setVerifyingCode(false);
    }
  }

  async function handleSubmit() {
    if (password.trim().length < 6) {
      setBannerTone("error");
      setBanner({ key: "auth.passwordTooShort" });
      return;
    }

    if (password !== confirmPassword) {
      setBannerTone("error");
      setBanner({ key: "auth.passwordsDontMatch" });
      return;
    }

    setSubmitting(true);
    setBanner(null);

    try {
      await updatePassword(password);
      toast.success(t("auth.passwordUpdatedToast"));
      router.replace("/rooms");
    } catch (error) {
      setBannerTone("error");
      setBanner({ text: friendlySupabaseError(error, t("auth.updatePasswordFailed")) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      heading={t("auth.resetHeading")}
      subtitle={showPasswordForm ? t("auth.resetSubtitle") : t("auth.resetCodeSubtitle")}
      topCtaHref="/sign-in"
      topCtaLabel={t("nav.signIn")}
      footerPrompt={t("auth.rememberedPassword")}
      footerLinkHref="/sign-in"
      footerLinkLabel={t("auth.signInLink")}
    >
      <StatusBanner tone={bannerTone} message={bannerMessage} />

      {phase === "checking" && !showPasswordForm ? (
        <div className="flex items-center justify-center gap-3 py-10 text-foreground/70" aria-busy="true">
          <Loader2 className="h-5 w-5 animate-spin" />
          {t("auth.resetHeading")}…
        </div>
      ) : !showPasswordForm ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="recovery-email" className="text-lg font-semibold">
              {t("auth.emailLabel")}
            </label>
            <div className="mt-3 flex items-center gap-3 rounded-[1.4rem] bg-[#f7f1e7] px-5 py-4">
              <Mail className="h-5 w-5 text-[#b18469]" />
              <input
                id="recovery-email"
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
            <label htmlFor="recovery-code" className="text-lg font-semibold">
              {t("auth.resetCodeLabel")}
            </label>
            <div className="mt-3 flex items-center gap-3 rounded-[1.4rem] bg-[#f7f1e7] px-5 py-4">
              <KeyRound className="h-5 w-5 text-[#b18469]" />
              <input
                id="recovery-code"
                // Text + numeric inputMode rather than type="number": a number
                // input adds spinners, strips leading zeros, and refuses pasted
                // codes on iOS. autoComplete="one-time-code" lets iOS and
                // Android offer the code straight from the notification.
                //
                // No maxLength: it counts RAW characters, so pasting "123 456"
                // straight out of the email was truncated to "123 45" before the
                // digit filter below could run, silently dropping a digit. The
                // onChange sanitiser is what enforces the length.
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={"0".repeat(RECOVERY_CODE_LENGTH)}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, RECOVERY_CODE_LENGTH))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleVerifyCode();
                }}
                className="w-full bg-transparent text-lg tracking-[0.4em] outline-none placeholder:text-[#b18469]"
              />
            </div>
            <p className="mt-2 text-base text-foreground/70">{t("auth.resetCodeHint")}</p>
          </div>

          <button
            type="button"
            onClick={() => void handleVerifyCode()}
            disabled={verifyingCode}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0f957d] px-6 py-5 text-xl font-semibold text-white transition hover:bg-[#0d856f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {verifyingCode ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {t("auth.resetCodeButton")}
          </button>
        </div>
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
