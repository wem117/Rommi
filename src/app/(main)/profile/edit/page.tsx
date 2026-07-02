"use client";

import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AvatarUpload } from "@/components/profile/avatar-upload";
import { useAuth } from "@/context/auth-context";
import { UNIVERSITIES } from "@/lib/constants/universities";
import { updateProfile } from "@/lib/data/profiles";
import { sendCurrentUserVerificationEmail } from "@/lib/supabase/auth";
import { profileCompletion } from "@/lib/utils/compatibility";
import type { LifestylePreferences, UserProfile } from "@/types/user";

const lifestyleOptions = {
  smoking: ["no", "outside", "yes", "no_preference"],
  pets: ["no_pets", "pet_friendly", "has_pets", "no_preference"],
  cleanliness: ["relaxed", "moderate", "very_clean"],
  sleepSchedule: ["early_bird", "balanced", "night_owl"],
  guests: ["rarely", "sometimes", "often"]
} as const;

export default function EditProfilePage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
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
        lookingForApartment: draft.lookingForApartment,
        photoURL: draft.photoURL ?? null,
        profileCompletion: completion,
        onboardingComplete: true
      });
      await refreshProfile();
      toast.success("Profile updated");
      router.push("/profile");
    } catch (error) {
      console.error(error);
      toast.error("Could not update profile");
    } finally {
      setSaving(false);
    }
  }

  async function verifyEmail() {
    try {
      await sendCurrentUserVerificationEmail();
      toast.success("Verification email sent");
    } catch {
      toast.error("Could not send verification email");
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl bg-white p-6 shadow-soft">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold">Edit profile</h1>
            <p className="mt-2 text-sm text-foreground/60">Keep your roommate profile accurate and current.</p>
          </div>
          {!user.emailVerified ? (
            <button
              type="button"
              onClick={() => void verifyEmail()}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold"
            >
              <Send className="h-4 w-4" />
              Verify email
            </button>
          ) : null}
        </div>

        <div className="mt-6">
          <AvatarUpload
            userId={user.uid}
            value={draft.photoURL}
            name={draft.fullName}
            onChange={(url) => updateField("photoURL", url)}
          />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Field label="Full name" value={draft.fullName} onChange={(value) => updateField("fullName", value)} />
          <Field
            label="Age"
            type="number"
            value={String(draft.age)}
            onChange={(value) => updateField("age", Number(value))}
          />
          <Select label="Gender" value={draft.gender} onChange={(value) => updateField("gender", value as UserProfile["gender"])}>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </Select>
          <Select label="University" value={draft.university} onChange={(value) => updateField("university", value)}>
            {UNIVERSITIES.map((university) => (
              <option key={university} value={university}>
                {university}
              </option>
            ))}
          </Select>
          <Field label="Occupation" value={draft.occupation} onChange={(value) => updateField("occupation", value)} />
          <Field
            label="Preferred move-in date"
            type="date"
            value={draft.preferredMoveInDate?.toISOString().slice(0, 10) ?? ""}
            onChange={(value) => updateField("preferredMoveInDate", value ? new Date(value) : null)}
          />
          <Field
            label="Min budget"
            type="number"
            value={String(draft.minBudget)}
            onChange={(value) => updateField("minBudget", Number(value))}
          />
          <Field
            label="Max budget"
            type="number"
            value={String(draft.maxBudget)}
            onChange={(value) => updateField("maxBudget", Number(value))}
          />
          <div className="sm:col-span-2">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              rows={4}
              value={draft.bio ?? ""}
              maxLength={500}
              onChange={(event) => updateField("bio", event.target.value)}
            />
          </div>
          <div className="sm:col-span-2 rounded-[1.5rem] border border-[#e8dccd] bg-[#f8f2e8] p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">Looking for apartment</div>
                <p className="mt-1 text-sm text-foreground/60">
                  When enabled, your roommate profile appears in roommate search results.
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateField("lookingForApartment", !draft.lookingForApartment)}
                className={`inline-flex h-11 w-20 items-center rounded-full p-1 transition ${
                  draft.lookingForApartment ? "bg-primary" : "bg-[#d8cdbd]"
                }`}
                aria-pressed={draft.lookingForApartment}
              >
                <span
                  className={`h-9 w-9 rounded-full bg-white shadow-sm transition ${
                    draft.lookingForApartment ? "translate-x-9" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {Object.entries(lifestyleOptions).map(([key, values]) => (
            <Select
              key={key}
              label={key.replace(/([A-Z])/g, " $1")}
              value={String(draft.lifestyle[key as keyof LifestylePreferences])}
              onChange={(value) =>
                updateLifestyle(
                  key as keyof LifestylePreferences,
                  value as LifestylePreferences[keyof LifestylePreferences]
                )
              }
            >
              {values.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => void saveProfile()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save profile
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
