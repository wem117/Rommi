"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { getRoommateProfiles } from "@/lib/data/profiles";
import type { UserProfile } from "@/types/user";

export function useRoommates() {
  const { user } = useAuth();
  const [roommates, setRoommates] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRoommates() {
      setLoading(true);
      setError(null);

      try {
        const nextProfiles = await getRoommateProfiles(user?.uid);
        if (!cancelled) setRoommates(nextProfiles);
      } catch (loadError) {
        console.error("Load roommates failed", loadError);
        if (!cancelled) setError("Could not load roommates.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRoommates();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  return { roommates, loading, error };
}
