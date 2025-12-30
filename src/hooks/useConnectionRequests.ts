// src/hooks/useConnectionRequests.ts
import { db } from "@/FirebaseConfig"; // Adjust path if needed
import { publicProfileApi } from "@/src/services/api/publicProfileApi"; // Use our new API
import type { UserProfile } from "@/src/types";
import { collection, documentId, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert } from "react-native";

interface UseConnectionRequestsReturn {
  requestUsers: UserProfile[];
  loading: boolean;
  acceptRequest: (senderId: string) => Promise<void>;
  rejectRequest: (senderId: string) => Promise<void>;
}

export function useConnectionRequests(
  currentUserId: string | undefined
): UseConnectionRequestsReturn {
  const [requestUsers, setRequestUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Real-time Listener for Pending Requests
  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Query: "Show me all friendships where I am the receiver AND status is pending"
    const q = query(
      collection(db, "friendships"),
      where("receiverId", "==", currentUserId),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const senderIds = snapshot.docs.map(doc => doc.data().senderId);

      if (senderIds.length === 0) {
        setRequestUsers([]);
        setLoading(false);
        return;
      }

      // 2. Fetch the Profiles of the people sending requests
      try {
        // We handle the "in" query limit of 10 items
        const chunks = [];
        for (let i = 0; i < senderIds.length; i += 10) {
           chunks.push(senderIds.slice(i, i + 10));
        }

        const allUsers: UserProfile[] = [];

        for (const chunk of chunks) {
           const usersQuery = query(
             collection(db, "users"),
             where(documentId(), "in", chunk)
           );
           const userSnaps = await getDocs(usersQuery);
           userSnaps.forEach(doc => allUsers.push(doc.data() as UserProfile));
        }

        setRequestUsers(allUsers);
      } catch (error) {
        console.error("Error fetching request profiles:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [currentUserId]);

  // 3. Accept Logic
  const acceptRequest = async (senderId: string) => {
    if (!currentUserId) return;

    // Optimistic Update: Remove from list instantly
    setRequestUsers(prev => prev.filter(u => u.uid !== senderId));

    try {
      await publicProfileApi.acceptConnectionRequest(currentUserId, senderId);
      console.log("✅ Connection accepted");
    } catch (error) {
      console.error("Error accepting:", error);
      Alert.alert("Error", "Could not accept request.");
      // The listener will automatically fix the list if it fails, so no need to manually revert
    }
  };

  // 4. Reject Logic
  const rejectRequest = async (senderId: string) => {
    if (!currentUserId) return;

    // Optimistic Update
    setRequestUsers(prev => prev.filter(u => u.uid !== senderId));

    try {
      // Rejection is the same as cancelling/deleting the request
      await publicProfileApi.cancelConnectionRequest(currentUserId, senderId);
      console.log("✅ Connection rejected");
    } catch (error) {
      console.error("Error rejecting:", error);
      Alert.alert("Error", "Could not reject request.");
    }
  };

  return {
    requestUsers,
    loading,
    acceptRequest,
    rejectRequest,
  };
}