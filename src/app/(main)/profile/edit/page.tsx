"use client";

import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AvatarUpload } from "@/components/profile/avatar-upload";
import { UniversityCombobox } from "@/components/shared/university-combobox";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { updateProfile } from "@/lib/data/profiles";
import { sendCurrentUserVerificationEmail } from "@/lib/supabase/auth";
import { profileCompletion } from "@/lib/utils/compatibility";
import { isValidPhone, isValidTelegram, normalizePhone, normalizeTelegram } from "@/lib/utils/contacts";
import type { LifestylePreferences, UserProfile } from "@/types/user";

const lifestyleOptions: Record<
  keyof LifestylePreferences,
  { labelKey: string; options: { value: string; labelKey: string }[] }
> = {
  smoking: {
    labelKey: "onboarding.smokingLabel",
    options: [
      { value: "no", labelKey: "onboarding.smokingNo" },
      { value: "outside", labelKey: "onboarding.smokingOutside" },
      { value: "yes", labelKey: "onboarding.smokingYes" },
      { value: "no_preference", labelKey: "onboarding.noPreference" }
    ]
  },
  pets: {
    labelKey: "onboarding.petsLabel",
    options: [
      { value: "no_pets", labelKey: "onboarding.petsNo" },
      { value: "pet_friendly", labelKey: "onboarding.petsFriendly" },
      { value: "has_pets", labelKey: "onboarding.petsHas" },
      { value: "no_preference", labelKey: "onboarding.noPreference" }
    ]
  },
  cleanliness: {
    labelKey: "onboarding.cleanlinessLabel",
    options: [
      { value: "relaxed", labelKey: "onboarding.cleanlinessRelaxed" },
      { value: "moderate", labelKey: "onboarding.cleanlinessModerate" },
      { value: "very_clean", labelKey: "onboarding.cleanlinessVeryClean" }
    ]
  },
  sleepSchedule: {
    labelKey: "onboarding.sleepScheduleLabel",
    options: [
      { value: "early_bird", labelKey: "onboarding.sleepEarlyBird" },
      { value: "balanced", labelKey: "onboarding.sleepBalanced" },
      { value: "night_owl", labelKey: "onboarding.sleepNightOwl" }
    ]
  },
  guests: {
    labelKey: "onboarding.guestsLabel",
    options: [
      { value: "rarely", labelKey: "onboarding.guestsRarely" },
      { value: "sometimes", labelKey: "onboarding.guestsSometimes" },
      { value: "often", labelKey: "onboarding.guestsOften" }
    ]
  }
};

export default function EditProfilePage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useLocale();
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<UserProfile | null>(profile);

  useEffect(() => {
    if (profile && !draft) setDraft(profile);
  }, [draft, profile]);

  if (!user || !draft) return null;

  function updateField<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateLifestyle<K extends keyof LifestylePreferences>(key: K, value: LifestylePreferences[K]) {
    setDraft((current) =>
      current ? { ...current, lifestyle: { ...current.lifestyle, [key]: value } } : current
    );
  }

  async function saveProfile() {
    if (!user || !draft) return;

    const telegramInput = (draft.telegram ?? "").trim();
    if (telegramInput && !isValidTelegram(telegramInput)) {
      toast.error(t("profileEdit.telegramInvalid"));
      return;
    }
    const phoneInput = (draft.phone ?? "").trim();
    if (phoneInput && !isValidPhone(phoneInput)) {
      toast.error(t("profileEdit.phoneInvalid"));
      return;
    }

    setSaving(true);
    try {
      const completion = profileCompletion(draft);
      await updateProfile({
        uid: user.uid,
        fullName: draft.fullName,
        age: Number(draft.age),
        gender: draft.gender,
        university: draft.university,
        occupation: draft.occupation,
        minBudget: Number(draft.minBudget),
        maxBudget: Number(draft.maxBudget),
        preferredMoveInDate: draft.preferredMoveInDate,
        lifestyle: draft.lifestyle,
        bio: draft.bio ?? "",
        telegram: telegramInput ? normalizeTelegram(telegramInput) : "",
        phone: phoneInput ? normalizePhone(phoneInput) : "",
        lookingForApartment: draft.lookingForApartment,
        photoURL: draft.photoURL ?? null,
        profileCompletion: completion,
        onboardingComplete: true
      });
      await refreshProfile();
      toast.success(t("profileEdit.profileUpdatedToast"));
      router.push("/profile");
    } catch (error) {
      console.error(error);
      toast.error(t("profileEdit.updateFailedToast"));
    } finally {
      setSaving(false);
    }
  }

  async function verifyEmail() {
    try {
      await sendCurrentUserVerificationEmail();
      toast.success(t("profileEdit.verificationEmailSentToast"));
    } catch {
      toast.error(t("profileEdit.verificationEmailFailedToast"));
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl bg-white p-6 shadow-soft">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold">{t("profileEdit.title")}</h1>
            <p className="mt-2 text-sm text-foreground/60">{t("profileEdit.subtitle")}</p>
          </div>
          {!user.emailVerified ? (
            <button
              type="button"
              onClick={() => void verifyEmail()}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold"
            >
              <Send className="h-4 w-4" />
              {t("profileEdit.verifyEmailButton")}
            </button>
          ) : null}
        </div>

        <div className="mt-6">
          <AvatarUpload
            value={draft.photoURL}
            name={draft.fullName}
            onChange={(url) => updateField("photoURL", url)}
          />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Field label={t("onboarding.fullNameLabel")} value={draft.fullName} onChange={(value) => updateField("fullName", value)} />
          <Field
            label={t("onboarding.ageLabel")}
            type="number"
            value={String(draft.age)}
            onChange={(value) => updateField("age", Number(value))}
          />
          <Select label={t("onboarding.genderLabel")} value={draft.gender} onChange={(value) => updateField("gender", value as UserProfile["gender"])}>
            <option value="female">{t("onboarding.genderFemale")}</option>
            <option value="male">{t("onboarding.genderMale")}</option>
            <option value="other">{t("onboarding.genderOther")}</option>
            <option value="prefer_not_to_say">{t("onboarding.genderPreferNotToSay")}</option>
          </Select>
          <div>
            <label htmlFor="university">{t("onboarding.universityLabel")}</label>
            <UniversityCombobox
              id="university"
              value={draft.university}
              onChange={(value) => updateField("university", value)}
            />
          </div>
          <Field label={t("onboarding.occupationLabel")} value={draft.occupation} onChange={(value) => updateField("occupation", value)} />
          <Field
            label={t("onboarding.moveInDateLabel")}
            type="date"
            value={draft.preferredMoveInDate?.toISOString().slice(0, 10) ?? ""}
            onChange={(value) => updateField("preferredMoveInDate", value ? new Date(value) : null)}
          />
          <Field
            label={t("onboarding.minBudgetLabel")}
            type="number"
            value={String(draft.minBudget)}
            onChange={(value) => updateField("minBudget", Number(value))}
          />
          <Field
            label={t("onboarding.maxBudgetLabel")}
            type="number"
            value={String(draft.maxBudget)}
            onChange={(value) => updateField("maxBudget", Number(value))}
          />
          <div className="sm:col-span-2">
            <label htmlFor="bio">{t("profileEdit.bioLabel")}</label>
            <textarea
              id="bio"
              rows={4}
              value={draft.bio ?? ""}
              maxLength={500}
              onChange={(event) => updateField("bio", event.target.value)}
            />
          </div>

          <div className="sm:col-span-2 rounded-[1.5rem] border border-[#e8dccd] bg-[#f8f2e8] p-4">
            <div className="text-sm font-semibold text-foreground">{t("profileEdit.contactsSectionTitle")}</div>
            <p className="mt-1 text-sm text-foreground/60">{t("profileEdit.contactsSectionHelp")}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="telegram">{t("profileEdit.telegramLabel")}</label>
                <input
                  id="telegram"
                  inputMode="text"
                  autoComplete="off"
                  placeholder={t("profileEdit.telegramPlaceholder")}
                  value={draft.telegram ?? ""}
                  onChange={(event) => updateField("telegram", event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="phone">{t("profileEdit.phoneLabel")}</label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={t("profileEdit.phonePlaceholder")}
                  value={draft.phone ?? ""}
                  onChange={(event) => updateField("phone", event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="sm:col-span-2 rounded-[1.5rem] border border-[#e8dccd] bg-[#f8f2e8] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">{t("profileEdit.lookingForApartmentLabel")}</div>
                <p className="mt-1 text-sm text-foreground/60">{t("profileEdit.lookingForApartmentDescription")}</p>
              </div>
              <div className="shrink-0 pt-0.5">
                <Switch
                  checked={draft.lookingForApartment}
                  onCheckedChange={(checked) => updateField("lookingForApartment", checked)}
                  aria-label={t("profileEdit.lookingForApartmentLabel")}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {(Object.keys(lifestyleOptions) as (keyof LifestylePreferences)[]).map((key) => {
            const config = lifestyleOptions[key];
            return (
              <Select
                key={key}
                label={t(config.labelKey)}
                value={String(draft.lifestyle[key])}
                onChange={(value) => updateLifestyle(key, value as LifestylePreferences[keyof LifestylePreferences])}
              >
                {config.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </Select>
            );
          })}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => void saveProfile()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("profileEdit.saveProfileButton")}
          </button>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  type = "text",
  onChange
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  children
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div>
      <label htmlFor={id} className="capitalize">
        {label}
      </label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="capitalize">
        {children}
      </select>
    </div>
  );
}
