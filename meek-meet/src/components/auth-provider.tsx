"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  role: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isLoading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roleState, setRoleState] = useState<{ userId: string; role: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Role only applies while it belongs to the current user; it is derived
  // from userId-keyed state so it clears automatically on sign-out/switch.
  const role = user && roleState?.userId === user.id ? roleState.role : null;

  // Listen for auth state changes
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  // Fetch profile role when user changes (separate effect, NOT inside onAuthStateChange)
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!cancelled) {
        setRoleState({ userId: user.id, role: data?.role ?? "member" });
      }
    };

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
