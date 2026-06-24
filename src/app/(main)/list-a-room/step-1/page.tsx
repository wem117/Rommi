"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { ListingForm } from "@/components/listings/listing-form/listing-form";
import { useAuth } from "@/context/auth-context";
import type { ListingInput } from "@/lib/validations/listing.schema";

export default function CreateListingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

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
      toast.error("Could not publish listing");
      return;
    }

    const data = (await response.json()) as { id: string };
    toast.success("Listing published");
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
        <h1 className="text-4xl font-bold">List a room</h1>
        <p className="mt-2 text-foreground/65">Publish a real room listing connected to your account.</p>
      </div>
      <ListingForm submitLabel="Publish Listing" onSubmit={createListing} />
    </section>
  );
}
