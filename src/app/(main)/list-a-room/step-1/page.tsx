"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ListingForm } from "@/components/listings/listing-form/listing-form";
import { useLocale } from "@/context/locale-context";
import type { ListingInput } from "@/lib/validations/listing.schema";

// No auth guard here: this route is under (main), whose MainLayout already
// blocks rendering (and redirects to /sign-in) until a signed-in, onboarded
// user is confirmed — see src/app/(main)/layout.tsx. A second guard here
// duplicated that check and could never actually fire, since this component
// only ever mounts once MainLayout has already guaranteed `user` exists.
export default function CreateListingPage() {
  const router = useRouter();
  const { t } = useLocale();

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
