// src/hooks/useConnectionRequests.ts
// Manages connection request notifications - FIXED

import { connectionApi } from "@/src/services/api/connectionApi";
import { userApi } from "@/src/services/api/userApi";
import type { UserProfile } from "@/src/types"; // ✅ FIXED: Import from types
import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

interface UseConnectionRequestsReturn {
  requestUsers: UserProfile[];
  loading: boolean;
  processingId: string | null;
  acceptRequest: (targetUid: string) => Promise<void>;
  rejectRequest: (targetUid: string) => Promise<void>;
  refreshRequests: () => Promise<void>;
}

export function useConnectionRequests(
  currentUserId: string | undefined,
  requestReceivedIds: string[] | undefined
): UseConnectionRequestsReturn {
  const [requestUsers, setRequestUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  /**
   * Fetch user profiles for connection requests
   */
  const fetchRequestProfiles = useCallback(
    async (forceRefresh: boolean = false) => {
      if (!currentUserId) return;

      let currentRequestIds = requestReceivedIds || [];

      // If force refresh, get fresh data from Firebase
      if (forceRefresh) {
        try {
          setLoading(true);
          const freshData = await userApi.getFreshUserData(currentUserId);
          if (freshData) {
            currentRequestIds = freshData.requestReceived || [];
          }
        } catch (e) {
          console.error("Error fetching fresh user doc:", e);
          setLoading(false);
          return;
        }
      }

      // No requests
      if (currentRequestIds.length === 0) {
        setRequestUsers([]);
        setLoading(false);
        return;
      }

      try {
        // Fetch user profiles (max 10 due to Firebase 'in' limit)
        const users = await userApi.getUsersByIds(currentRequestIds);
        setRequestUsers(users);
      } catch (e) {
        console.error("Error fetching request profiles:", e);
      } finally {
        setLoading(false);
      }
    },
    [currentUserId, requestReceivedIds]
  );

  // Auto-fetch when requestReceivedIds changes
  useEffect(() => {
    fetchRequestProfiles(false);
  }, [fetchRequestProfiles]);

  /**
   * Refresh notifications (with force refresh)
   */
  const refreshRequests = async () => {
    setLoading(true);
    await fetchRequestProfiles(true);
  };

  /**
   * Accept connection request
   */
  const acceptRequest = async (targetUid: string) => {
    if (!currentUserId || !targetUid) return;

    // Optimistic update - remove from UI immediately
    setRequestUsers((currentList) =>
      currentList.filter((u) => u.uid !== targetUid)
    );

    setProcessingId(targetUid);

    try {
      await connectionApi.acceptRequest(currentUserId, targetUid);
      console.log("✅ Connection accepted");

    } catch (error) {
      console.error("Error accepting request:", error);
      Alert.alert("Error", "Could not accept request.");

      // Revert optimistic update on error
      await fetchRequestProfiles(true);

    } finally {
      setProcessingId(null);
    }
  };

  /**
   * Reject connection request
   */
  const rejectRequest = async (targetUid: string) => {
    if (!currentUserId) return;

    // Optimistic update - remove from UI immediately
    setRequestUsers((currentList) =>
      currentList.filter((u) => u.uid !== targetUid)
    );

    setProcessingId(targetUid);

    try {
      await connectionApi.rejectRequest(currentUserId, targetUid);
      console.log("✅ Connection rejected");

    } catch (error) {
      console.error("Error rejecting request:", error);
      Alert.alert("Error", "Could not reject request.");

      // Revert optimistic update on error
      await fetchRequestProfiles(true);

    } finally {
      setProcessingId(null);
    }
  };

  return {
    requestUsers,
    loading,
    processingId,
    acceptRequest,
    rejectRequest,
    refreshRequests,
  };
}