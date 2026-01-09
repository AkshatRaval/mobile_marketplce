import { profileApi } from "@/src/services/api/profileApi";
import { supabase } from "@/src/supabaseConfig";
import { useCallback, useEffect, useState } from "react";

interface UseProfileDataReturn {
  profileData: any | null;
  listings: any[];
  connectionsUsers: any[];
  loading: boolean;
  refetch: () => Promise<void>; // ✅ Added refetch type
}

export function useProfileData(userId: string | undefined): UseProfileDataReturn {
  const [listings, setListings] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [connectionsUsers, setConnectionsUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ------------------------------------------
  // 1. Define Data Fetchers (Reusable)
  // ------------------------------------------

  // Fetch Connections Logic
  const fetchConnections = useCallback(async () => {
    if (!userId) return;
    try {
      // A. Fetch accepted connections
      const { data: connections, error } = await supabase
        .from("connections")
        .select("sender_id, receiver_id")
        .eq("status", "accepted")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

      if (error) throw error;

      if (!connections || connections.length === 0) {
        setConnectionsUsers([]);
        return;
      }

      // B. Extract Friend IDs
      const friendIds = connections.map((conn) =>
        conn.sender_id === userId ? conn.receiver_id : conn.sender_id
      );

      if (friendIds.length === 0) {
        setConnectionsUsers([]);
        return;
      }

      // C. Fetch Profiles
      const { data: friends, error: friendsError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", friendIds);

      if (friendsError) throw friendsError;

      const formattedFriends = friends.map((f) => ({
        uid: f.id,
        displayName: f.display_name,
        photoURL: f.photo_url,
        shopName: f.shop_name,
        ...f,
      }));

      setConnectionsUsers(formattedFriends);
    } catch (err) {
      console.error("Error fetching connections:", err);
    }
  }, [userId]);

  // ✅ MANUAL REFETCH FUNCTION
  // This is what Pull-to-Refresh calls
  const refetch = useCallback(async () => {
    if (!userId) return;
    console.log("🔄 Manual refetch triggered...");
    
    try {
      // 1. Manually fetch Profile & Listings (One-time fetch)
      // We use the helper methods from profileApi we created earlier
      const [newProfile, newListings] = await Promise.all([
        profileApi.getUserProfile(userId),
        profileApi.getUserPosts(userId)
      ]);

      if (newProfile) setProfileData(newProfile);
      if (newListings) setListings(newListings);

      // 2. Manually fetch Connections
      await fetchConnections();
      
    } catch (error) {
      console.error("Refetch error:", error);
    }
  }, [userId, fetchConnections]);

  // ------------------------------------------
  // 2. Real-time Subscriptions (Effects)
  // ------------------------------------------

  // Profile & Listings Subscription
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = profileApi.subscribeToProfile(
      userId,
      (data, fetchedListings) => {
        setProfileData(data);
        setListings(fetchedListings);
        setLoading(false);
      },
      (error) => {
        console.error("Profile subscription error:", error);
        setLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [userId]);

  // Connections Subscription
  useEffect(() => {
    if (!userId) return;

    fetchConnections(); // Initial fetch

    const channel = supabase
      .channel("profile_connections")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connections",
          filter: `status=eq.accepted`,
        },
        () => {
          console.log("🔔 Connections changed, refreshing list...");
          fetchConnections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchConnections]);

  // ✅ Return refetch
  return {
    profileData,
    listings,
    connectionsUsers,
    loading,
    refetch,
  };
}