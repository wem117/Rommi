"use client";

import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { converter, timestampToDate } from "@/lib/firebase/firestore";
import type { UserProfile } from "@/types/user";

function normalizeProfile(data: UserProfile): UserProfile {
  return {
    ...data,
    preferredMoveInDate: timestampToDate(data.preferredMoveInDate) ?? null,
    createdAt: timestampToDate(data.createdAt) ?? new Date(),
    updatedAt: timestampToDate(data.updatedAt) ?? new Date()
  };
}

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
        const { db } = await import("@/lib/firebase/client");
        const snapshot = await getDocs(
          query(
            collection(db, "users").withConverter(converter<UserProfile>()),
            where("onboardingComplete", "==", true),
            orderBy("createdAt", "desc"),
            limit(50)
          )
        );
        if (cancelled) return;
        setRoommates(
          snapshot.docs
            .map((docSnapshot) => normalizeProfile(docSnapshot.data()))
            .filter((profile) => profile.uid !== user?.uid)
        );
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
