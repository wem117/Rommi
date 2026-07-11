"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useLocale } from "@/context/locale-context";
import { useFavorites } from "@/hooks/use-favorites";
import { friendlySupabaseError } from "@/lib/utils/errors";

export function FavoriteRoommateButton({
  roommateId,
  showLabel = false
}: {
  roommateId: string;
  showLabel?: boolean;
}) {
  const { isRoommateFavorite, toggleFavoriteRoommate } = useFavorites();
  const { t } = useLocale();
  const [saving, setSaving] = useState(false);
  const active = isRoommateFavorite(roommateId);

  async function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setSaving(true);
    try {
      await toggleFavoriteRoommate(roommateId);
    } catch (error) {
      console.error(error);
      toast.error(friendlySupabaseError(error, t("shared.savedRoommatesUpdateFailed")));
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={saving}
      className={`inline-flex items-center gap-2 rounded-full shadow-soft transition ${
        showLabel ? "px-5 py-3 text-base font-semibold" : "p-2"
      } ${
        active ? "bg-primary text-white" : "bg-white text-foreground/70"
      } disabled:opacity-60`}
      aria-label={active ? t("shared.removeSavedRoommate") : t("shared.saveRoommate")}
    >
      <Heart className={`h-4 w-4 ${active ? "fill-current" : ""}`} />
      {showLabel ? <span>{active ? t("shared.savedProfileLabel") : t("shared.saveProfileLabel")}</span> : null}
    </button>
  );
}
