// src/hooks/useProfileData.ts
// Profile data fetching with real-time updates (Supabase Version)

import { profileApi } from "@/src/services/api/profileApi";
import { supabase } from "@/src/supabaseConfig";
import { useEffect, useState } from "react";

interface UseProfileDataReturn {
  profileData: any | null;
  listings: any[];
  connectionsUsers: any[];
  loading: boolean;
}

export function useProfileData(userId: string | undefined): UseProfileDataReturn {
  const [listings, setListings] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [connectionsUsers, setConnectionsUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. PROFILE & LISTINGS SUBSCRIPTION
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    console.log("🔌 Setting up profile subscription...");
    setLoading(true);

    // This function inside profileApi is already migrated to Supabase
    // It listens to 'profiles' and 'products' tables
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
      // Unsubscribe logic depends on how profileApi.subscribeToProfile returns cleanup
      // If it returns a function, call it.
      if (typeof unsubscribe === 'function') {
         unsubscribe();
      }
    };
  }, [userId]);

  // 2. CONNECTIONS SUBSCRIPTION (Supabase Way)
  useEffect(() => {
    if (!userId) return;

    console.log("👥 Setting up real-time connections listener...");

    const fetchConnections = async () => {
      try {
        // A. Fetch accepted connections where I am sender or receiver
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

        // B. Extract Friend IDs (The one that is NOT me)
        const friendIds = connections.map(conn => 
          conn.sender_id === userId ? conn.receiver_id : conn.sender_id
        );

        if (friendIds.length === 0) {
          setConnectionsUsers([]);
          return;
        }

        // C. Fetch Profiles of these friends
        const { data: friends, error: friendsError } = await supabase
          .from("profiles")
          .select("*")
          .in("id", friendIds);

        if (friendsError) throw friendsError;

        // Map data to match your UI expectations (camelCase)
        const formattedFriends = friends.map(f => ({
           uid: f.id,
           displayName: f.display_name,
           photoURL: f.photo_url,
           shopName: f.shop_name,
           ...f
        }));

        setConnectionsUsers(formattedFriends);

      } catch (err) {
        console.error("Error fetching connections:", err);
      }
    };

    // Initial Fetch
    fetchConnections();

    // Real-time Listener for 'connections' table
    const channel = supabase
      .channel("profile_connections")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen for any change (insert/update/delete)
          schema: "public",
          table: "connections",
          filter: `status=eq.accepted` // simplified filter, ideally filter by user ID logic if RLS permits
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
  }, [userId]);

  return {
    profileData,
    listings,
    connectionsUsers,
    loading,
  };
}