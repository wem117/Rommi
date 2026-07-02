"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { getRoommateProfiles } from "@/lib/data/profiles";
import { friendlySupabaseError } from "@/lib/utils/errors";
import { type AsyncStatus, withRetry } from "@/lib/utils/retry";
import type { UserProfile } from "@/types/user";

export function useRoommates() {
  const { user } = useAuth();
  const [roommates, setRoommates] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AsyncStatus>("idle");

  useEffect(() => {
    let cancelled = false;

    async function loadRoommates() {
      setLoading(true);
      setError(null);
      setStatus("loading");

      try {
        const nextProfiles = await withRetry(() => getRoommateProfiles(user?.uid), {
          onRetry: () => setStatus("retrying")
        });
        if (!cancelled) setRoommates(nextProfiles);
        if (!cancelled) setStatus("success");
      } catch (loadError) {
        console.error("Load roommates failed", loadError);
        if (!cancelled) {
          setError(friendlySupabaseError(loadError, "Could not load roommates."));
          setStatus("error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRoommates();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  return { roommates, data: roommates, loading, error, status };
}
