// src/context/AuthContext.tsx
import { supabase } from "@/src/supabaseConfig";
import { Session, User } from "@supabase/supabase-js";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

// Define the shape of your User Profile
type UserProfile = {
  id: string;
  email: string;
  display_name: string;
  shop_name: string;
  phone: string;
  photo_url?: string;
  role: "user" | "dealer" | "admin";
  onboarding_status: "submitted" | "approved" | "rejected" | "suspended";
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  userDoc: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userDoc: null,
  loading: true,
  isAdmin: false,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper: Fetch profile safely
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.log("⚠️ AuthContext: Profile fetch error", error.message);
        return null;
      }
      return data as UserProfile;
    } catch (err) {
      return null;
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    const profile = await fetchProfile(user.id);
    setUserDoc(profile);
  };

  useEffect(() => {
    let mounted = true;

    const setupAuth = async () => {
      try {
        // 1. Get Initial Session
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);

          if (initialSession?.user) {
            const profile = await fetchProfile(initialSession.user.id);
            if (mounted) setUserDoc(profile);
          }
        }
      } catch (error) {
        console.error("Auth setup error:", error);
      } finally {
        // Only set loading false ONCE after initial check
        if (mounted) setLoading(false);
      }

      // 2. Listen for future changes (Login/Logout)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          console.log(`🔔 Auth Event: ${event}`);
          
          if (mounted) {
            setSession(newSession);
            setUser(newSession?.user ?? null);

            // Handle Profile Data
            if (newSession?.user) {
              // Only fetch if we don't have it, or if it's a different user
              // (Optional optimization: compare IDs to prevent re-fetching on token refresh)
              const profile = await fetchProfile(newSession.user.id);
              setUserDoc(profile);
            } else {
              setUserDoc(null);
            }
            
            // ⚠️ CRITICAL FIX: Do NOT set loading(true) here. 
            // It causes infinite loops on token refresh.
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    };

    setupAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const isAdmin = userDoc?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        userDoc,
        loading,
        isAdmin,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};