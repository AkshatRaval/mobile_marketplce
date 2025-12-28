// src/hooks/useProfileData.ts
// Profile data fetching with real-time updates
// EXTRACTED FROM: profile.tsx lines 158-187

import { profileApi } from "@/src/services/api/profileApi";
import { useEffect, useState } from "react";

interface UseProfileDataReturn {
  profileData: any | null;
  listings: any[];
  connectionsUsers: any[];
  loading: boolean;
}

/**
 * Hook for fetching profile data with real-time updates
 * EXTRACTED FROM: profile.tsx
 * - Lines 158-161: State declarations
 * - Lines 162-176: Profile subscription
 * - Lines 178-187: Connections subscription
 */
export function useProfileData(userId: string | undefined): UseProfileDataReturn {
  // STATE
  // EXTRACTED FROM: profile.tsx lines 158-161
  
  // LINE 158: const [listings, setListings] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  
  // LINE 159: const [profileData, setProfileData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  
  // LINE 160: const [connectionsUsers, setConnectionsUsers] = useState<any[]>([]);
  const [connectionsUsers, setConnectionsUsers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  // PROFILE SUBSCRIPTION
  // EXTRACTED FROM: profile.tsx lines 162-176
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    console.log("🔌 Setting up profile subscription...");
    setLoading(true);

    // LINE 164-176: Subscribe to profile updates
    const unsubscribe = profileApi.subscribeToProfile(
      userId,
      (data, fetchedListings) => {
        // LINE 169: setProfileData(data);
        setProfileData(data);
        
        // LINE 170: setListings([...(data.listings || [])].reverse());
        setListings(fetchedListings);
        
        setLoading(false);
      },
      (error) => {
        console.error("Profile subscription error:", error);
        setLoading(false);
      }
    );

    // LINE 175: Cleanup
    return () => {
      console.log("🔌 Cleaning up profile subscription...");
      unsubscribe();
    };
  }, [userId]);

  // CONNECTIONS SUBSCRIPTION
  // EXTRACTED FROM: profile.tsx lines 178-187
  useEffect(() => {
    // LINE 179-181: Check if connections exist
    if (!profileData?.connections?.length) {
      setConnectionsUsers([]);
      return;
    }

    console.log("👥 Setting up connections subscription...");

    // LINE 184-186: Subscribe to connections
    const unsubscribe = profileApi.subscribeToConnections(
      profileData.connections,
      (users) => {
        // LINE 185: setConnectionsUsers(...)
        setConnectionsUsers(users);
      },
      (error) => {
        console.error("Connections subscription error:", error);
      }
    );

    // Cleanup
    return () => {
      if (unsubscribe) {
        console.log("👥 Cleaning up connections subscription...");
        unsubscribe();
      }
    };
  }, [profileData?.connections]);

  return {
    profileData,
    listings,
    connectionsUsers,
    loading,
  };
}