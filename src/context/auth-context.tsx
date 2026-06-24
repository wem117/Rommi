"use client";

import type { User as FirebaseUser } from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { toast } from "sonner";

import { converter, timestampToDate } from "@/lib/firebase/firestore";
import type { UserProfile } from "@/types/user";

interface AuthContextValue {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeProfile(data: UserProfile): UserProfile {
  return {
    ...data,
    preferredMoveInDate: timestampToDate(data.preferredMoveInDate) ?? null,
    createdAt: timestampToDate(data.createdAt) ?? new Date(),
    updatedAt: timestampToDate(data.updatedAt) ?? new Date()
  };
}

async function syncSession(user: FirebaseUser | null) {
  if (!user) {
    await fetch("/api/auth/session", { method: "DELETE" });
    return;
  }

  const idToken = await user.getIdToken();
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });

  if (!response.ok) {
    throw new Error("Unable to sync session");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    let unsubscribeAuth: (() => void) | undefined;
    let cancelled = false;

    async function startAuthListener() {
      try {
        const [{ auth, db }, { onAuthStateChanged }, { doc, onSnapshot }] = await Promise.all([
          import("@/lib/firebase/client"),
          import("firebase/auth"),
          import("firebase/firestore")
        ]);

        if (cancelled) return;

        unsubscribeAuth = onAuthStateChanged(auth, async (nextUser) => {
          unsubscribeProfile?.();
          setUser(nextUser);
          setProfile(null);

          try {
            await syncSession(nextUser);

            if (!nextUser) {
              setLoading(false);
              return;
            }

            const profileRef = doc(db, "users", nextUser.uid).withConverter(converter<UserProfile>());
            unsubscribeProfile = onSnapshot(
              profileRef,
              (snapshot) => {
                setProfile(snapshot.exists() ? normalizeProfile(snapshot.data()) : null);
                setLoading(false);
              },
              (error) => {
                console.error("Profile listener failed", error);
                toast.error("Could not load your profile");
                setLoading(false);
              }
            );
          } catch (error) {
            console.error("Auth session sync failed", error);
            toast.error("Could not start your secure session");
            setLoading(false);
          }
        });
      } catch (error) {
        console.error("Firebase auth initialization failed", error);
        setLoading(false);
      }
    }

    void startAuthListener();

    return () => {
      cancelled = true;
      unsubscribeProfile?.();
      unsubscribeAuth?.();
    };
  }, []);

  const signOut = useCallback(async () => {
    const [{ auth }, { signOut: firebaseSignOut }] = await Promise.all([
      import("@/lib/firebase/client"),
      import("firebase/auth")
    ]);
    await fetch("/api/auth/session", { method: "DELETE" });
    await firebaseSignOut(auth);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, signOut }),
    [user, profile, loading, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
