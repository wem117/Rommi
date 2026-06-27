"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { ListingForm } from "@/components/listings/listing-form/listing-form";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import type { ListingInput } from "@/lib/validations/listing.schema";

export default function CreateListingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLocale();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/sign-in?redirect=/list-a-room/step-1");
    }
  }, [loading, router, user]);

  async function createListing(values: ListingInput) {
    const response = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(payload?.error || t("listingForm.publishError"));
      return;
    }

    const data = (await response.json()) as { id: string };
    toast.success(t("listingForm.publishSuccess"));
    router.replace(`/rooms/${data.id}`);
  }

  if (loading || !user) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-soft">
        <div className="h-8 w-48 animate-pulse rounded-full bg-background" />
        <div className="mt-6 h-80 animate-pulse rounded-2xl bg-background" />
      </div>
    );
  }

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-4xl font-bold">{t("listingForm.pageTitle")}</h1>
        <p className="mt-2 text-foreground/65">{t("listingForm.pageDescription")}</p>
      </div>
      <ListingForm submitLabel={t("listingForm.publish")} onSubmit={createListing} />
    </section>
  );
}
