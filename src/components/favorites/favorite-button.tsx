"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useFavorites } from "@/hooks/use-favorites";

export function FavoriteButton({ listingId }: { listingId: string }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [saving, setSaving] = useState(false);
  const active = isFavorite(listingId);

  async function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setSaving(true);
    try {
      await toggleFavorite(listingId);
    } catch (error) {
      console.error(error);
      toast.error("Could not update favorites");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={saving}
      className={`rounded-full p-2 shadow-soft transition ${
        active ? "bg-primary text-white" : "bg-white text-foreground/70"
      } disabled:opacity-60`}
      aria-label={active ? "Remove favorite" : "Save listing"}
    >
      <Heart className={`h-4 w-4 ${active ? "fill-current" : ""}`} />
    </button>
  );
}
