"use client";

import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { ListingForm } from "@/components/listings/listing-form/listing-form";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { deleteImageByUrl } from "@/lib/supabase/storage";
import type { ListingInput } from "@/lib/validations/listing.schema";
import { useListing } from "@/hooks/use-listing";

export default function EditListingPage() {
  const params = useParams<{ listingId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLocale();
  const { listing, loading, error } = useListing(params.listingId);

  useEffect(() => {
    if (!loading && listing && user?.uid !== listing.ownerId) {
      router.replace(`/rooms/${listing.id}`);
    }
  }, [listing, loading, router, user?.uid]);

  async function updateListing(values: ListingInput) {
    const response = await fetch(`/api/listings/${params.listingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });

    if (!response.ok) {
      toast.error(t("listingEdit.updateFailed"));
      return;
    }

    toast.success(t("listingEdit.updated"));
    router.push(`/rooms/${params.listingId}`);
  }

  async function deleteListing() {
    if (!listing || !window.confirm(t("listingEdit.confirmDelete"))) return;
    const response = await fetch(`/api/listings/${params.listingId}`, { method: "DELETE" });

    if (!response.ok) {
      toast.error(t("listingEdit.deleteFailed"));
      return;
    }

    await Promise.all(listing.photoUrls.map((url) => deleteImageByUrl(url).catch(() => undefined)));
    toast.success(t("listingEdit.deleted"));
    router.push("/rooms");
  }

  if (loading) {
    return (
      <main className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (error || !listing) {
    return <main className="mx-auto max-w-4xl px-4 py-10">{t("listingDetail.listingNotFound")}</main>;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-4xl font-bold">{t("listingEdit.title")}</h1>
        <p className="mt-2 text-foreground/65">{t("listingEdit.subtitle")}</p>
      </div>
      <ListingForm
        initialListing={listing}
        submitLabel={t("listingEdit.saveChanges")}
        onSubmit={updateListing}
        onDelete={deleteListing}
      />
    </main>
  );
}
