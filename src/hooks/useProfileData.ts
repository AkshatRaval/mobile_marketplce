// src/hooks/useProfileData.ts
// Profile data fetching with real-time updates

import { db } from "@/FirebaseConfig";
import { profileApi } from "@/src/services/api/profileApi";
import { collection, documentId, onSnapshot, query, where } from "firebase/firestore";
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
      unsubscribe();
    };
  }, [userId]);

  // 2. CONNECTIONS SUBSCRIPTION (The New Way)
  // We listen to the 'friendships' collection instead of the user document array
  useEffect(() => {
    if (!userId) return;

    console.log("👥 Setting up real-time connections listener...");

    const q = query(
      collection(db, "friendships"),
      where("users", "array-contains", userId),
      where("status", "==", "accepted")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // A. Extract Friend IDs
      const friendIds = snapshot.docs.map(doc => {
        const data = doc.data();
        return data.users.find((id: string) => id !== userId);
      });

      if (friendIds.length === 0) {
        setConnectionsUsers([]);
        return;
      }

      try {
        const usersQuery = query(
          collection(db, "users"),
          where(documentId(), "in", friendIds.slice(0, 10)) // Limit 10 for 'in' query safety
        );

        const usersUnsub = onSnapshot(usersQuery, (userSnap) => {
           const users = userSnap.docs.map(d => d.data());
           setConnectionsUsers(users);
        });
      } catch (error) {
        console.error("Error fetching connection profiles:", error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  return {
    profileData,
    listings,
    connectionsUsers,
    loading,
  };
}