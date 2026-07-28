"use client";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { getRoommateProfiles } from "@/lib/data/profiles";
import { friendlySupabaseError } from "@/lib/utils/errors";
import { type AsyncStatus, withRetry } from "@/lib/utils/retry";
import type { UserProfile } from "@/types/user";

export function useRoommates(initialRoommates?: UserProfile[]) {
  const { user } = useAuth();
  // Seed from SSR data for instant paint; the effect still refetches to exclude
  // the current user and pick up any session-scoped data.
  const [roommates, setRoommates] = useState<UserProfile[]>(initialRoommates ?? []);
  const [loading, setLoading] = useState(!initialRoommates);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AsyncStatus>(initialRoommates ? "success" : "idle");

  const seededRef = useRef(Boolean(initialRoommates));

  useEffect(() => {
    let cancelled = false;

    async function loadRoommates() {
      // On the first run after an SSR seed, refetch in the background without
      // flashing the skeleton over already-rendered content.
      if (seededRef.current) {
        seededRef.current = false;
      } else {
        setLoading(true);
      }
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
