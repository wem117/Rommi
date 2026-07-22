"use client";

import type { User } from "@supabase/supabase-js";
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

import { getProfileById } from "@/lib/data/profiles";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signOut as signOutFromSupabase } from "@/lib/supabase/auth";
import type { AuthUser } from "@/types/auth";
import type { UserProfile } from "@/types/user";

interface AuthContextValue {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapUser(user: User | null): AuthUser | null {
  if (!user) return null;

  return {
    uid: user.id,
    email: user.email ?? null,
    photoURL: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    emailVerified: Boolean(user.email_confirmed_at)
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!user?.uid) return;
    const nextProfile = await getProfileById(user.uid);
    setProfile(nextProfile);
  }, [user?.uid]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    async function loadProfileData(userId: string) {
      try {
        const nextProfile = await getProfileById(userId);
        if (!cancelled) setProfile(nextProfile);
      } catch (error) {
        console.error("Failed to load profile", error);
        if (!cancelled) toast.error("Could not load your profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // Apply an auth session to state. Identity (`user`) is set synchronously so
    // the navbar reflects login/logout instantly with no refresh; the profile
    // fetch is deferred to a macrotask because calling Supabase data APIs from
    // inside onAuthStateChange (while it holds the auth lock) can deadlock.
    function applySession(nextUser: User | null, deferProfile: boolean) {
      setUser(mapUser(nextUser));
      setProfile(null);

      if (!nextUser) {
        if (!cancelled) setLoading(false);
        return;
      }

      setLoading(true);
      if (deferProfile) {
        setTimeout(() => {
          if (!cancelled) void loadProfileData(nextUser.id);
        }, 0);
      } else {
        void loadProfileData(nextUser.id);
      }
    }

    // Tracks the applied user so repeated auth events for the same session are
    // ignored (see below).
    let lastUserId: string | null = null;

    // Initial read runs outside any auth-change callback, so no deferral needed.
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) {
        lastUserId = data.user?.id ?? null;
        applySession(data.user ?? null, false);
      }
    });

    // Supabase re-emits auth events (TOKEN_REFRESHED, and SIGNED_IN on tab
    // focus / INITIAL_SESSION) for the SAME user. Re-applying those would reset
    // the profile to null and refetch it on every tab switch — a visible flash
    // and a wasted request. Only react when the signed-in user actually
    // changes; USER_UPDATED still refreshes profile data for the same user.
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "TOKEN_REFRESHED") return;
      const nextUserId = session?.user?.id ?? null;
      if (nextUserId === lastUserId && event !== "USER_UPDATED") return;
      lastUserId = nextUserId;
      applySession(session?.user ?? null, true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await signOutFromSupabase();
    setProfile(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, signOut, refreshProfile }),
    [loading, profile, refreshProfile, signOut, user]
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
