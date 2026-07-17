"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useLocale } from "@/context/locale-context";
import { useFavorites } from "@/hooks/use-favorites";

export function FavoriteButton({ listingId }: { listingId: string }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { t } = useLocale();
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
      toast.error(t("shared.favoritesUpdateFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={saving}
      className={`rounded-full p-2 shadow-soft transition-all duration-200 hover:scale-110 hover:shadow-md active:scale-90 ${
        active ? "bg-primary text-white" : "bg-white text-foreground/70 hover:text-destructive"
      } disabled:opacity-60`}
      aria-label={active ? t("shared.removeFavorite") : t("listingDetail.saveListing")}
    >
      <Heart className={`h-4 w-4 transition-transform ${active ? "roomi-heart-pop fill-current" : ""}`} />
    </button>
  );
}
