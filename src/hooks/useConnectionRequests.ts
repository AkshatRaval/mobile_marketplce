// src/hooks/useConnectionRequests.ts
import { publicProfileApi } from "@/src/services/api/publicProfileApi"; // Ensure this API is also migrated!
import { supabase } from "@/src/supabaseConfig";
import type { UserProfile } from "@/src/types";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

interface UseConnectionRequestsReturn {
  requestUsers: UserProfile[];
  loading: boolean;
  acceptRequest: (senderId: string) => Promise<void>;
  rejectRequest: (senderId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useConnectionRequests(
  currentUserId: string | undefined
): UseConnectionRequestsReturn {
  const [requestUsers, setRequestUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to fetch data wrapped in useCallback
  const fetchRequests = useCallback(async () => {
    if (!currentUserId) return;

    try {
      // Step A: Get all pending connection requests where I am the receiver
      const { data: connections, error: connError } = await supabase
        .from("connections")
        .select("sender_id")
        .eq("receiver_id", currentUserId)
        .eq("status", "pending");

      if (connError) throw connError;

      const senderIds = connections?.map((c) => c.sender_id) || [];

      if (senderIds.length === 0) {
        setRequestUsers([]);
        return;
      }

      // Step B: Fetch the profiles for these senders
      const { data: profiles, error: profError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", senderIds);

      if (profError) throw profError;

      // Map to UserProfile type (ensure your DB columns match your type)
      const mappedProfiles: UserProfile[] = profiles.map((p) => ({
        uid: p.id, // Map 'id' to 'uid' for compatibility
        displayName: p.display_name,
        photoURL: p.photo_url,
        email: p.email,
        shopName: p.shop_name,
        // Add other fields as necessary
        ...p,
      }));

      setRequestUsers(mappedProfiles);
    } catch (error) {
      console.error("Error fetching request profiles:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // 1. Fetch & Real-time Listener for Pending Requests
  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchRequests();

    // Real-time Subscription (Listen for new requests or status changes)
    const channel = supabase
      .channel(`connection_requests_${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen for INSERT, UPDATE, DELETE
          schema: "public",
          table: "connections",
          // Removing specific filter to rely on RLS and ensure we catch all relevant events
          // filter: `receiver_id=eq.${currentUserId}`, 
        },
        (payload) => {
          // Check if the change is relevant to us (optimization)
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;

          const isRelevant =
            (newRecord?.receiver_id === currentUserId) ||
            (oldRecord?.receiver_id === currentUserId) ||
            (newRecord?.sender_id === currentUserId) || // Also refresh if we sent something (e.g. accepted)
            (oldRecord?.sender_id === currentUserId);

          if (isRelevant) {
            console.log("🔔 Relevant connection change detected, refreshing...");
            fetchRequests();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchRequests]);

  // 2. Accept Logic
  const acceptRequest = async (senderId: string) => {
    if (!currentUserId) return;

    // Optimistic Update
    setRequestUsers((prev) => prev.filter((u) => u.uid !== senderId));

    try {
      await publicProfileApi.acceptConnectionRequest(currentUserId, senderId);
      // console.log("✅ Connection accepted");
      fetchRequests(); // Verify state
    } catch (error) {
      console.error("Error accepting:", error);
      Alert.alert("Error", "Could not accept request.");
      fetchRequests(); // Revert state on error
    }
  };

  // 3. Reject Logic
  const rejectRequest = async (senderId: string) => {
    if (!currentUserId) return;

    // Optimistic Update
    setRequestUsers((prev) => prev.filter((u) => u.uid !== senderId));

    try {
      await publicProfileApi.cancelConnectionRequest(currentUserId, senderId);
      // console.log("✅ Connection rejected");
      fetchRequests(); // Verify state
    } catch (error) {
      console.error("Error rejecting:", error);
      Alert.alert("Error", "Could not reject request.");
      fetchRequests(); // Revert state on error
    }
  };

  return {
    requestUsers,
    loading,
    acceptRequest,
    rejectRequest,
    refetch: fetchRequests,
  };
}