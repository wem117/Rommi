"use client";

import type { Session, User } from "@supabase/supabase-js";
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

async function syncServerSession(session: Session | null) {
  if (!session?.access_token) {
    await fetch("/api/auth/session", { method: "DELETE" });
    return;
  }

  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessToken: session.access_token,
      refreshToken: session.refresh_token
    })
  });

  if (!response.ok) {
    throw new Error("Unable to sync session");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    async function loadProfile(nextUser: User | null) {
      setUser(mapUser(nextUser));
      setProfile(null);

      try {
        const { data } = await supabase.auth.getSession();
        await syncServerSession(data.session ?? null);

        if (!nextUser) {
          if (!cancelled) setLoading(false);
          return;
        }

        const nextProfile = await getProfileById(nextUser.id);
        if (!cancelled) {
          setProfile(nextProfile);
          setLoading(false);
        }
      } catch (error) {
        console.error("Auth session sync failed", error);
        if (!cancelled) {
          toast.error("Could not start your secure session");
          setLoading(false);
        }
      }
    }

    void supabase.auth.getUser().then(({ data }) => loadProfile(data.user ?? null));

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true);
      void loadProfile(session?.user ?? null);
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
    () => ({ user, profile, loading, signOut }),
    [loading, profile, signOut, user]
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
