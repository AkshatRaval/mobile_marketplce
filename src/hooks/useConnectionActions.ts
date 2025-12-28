// src/hooks/useConnectionActions.ts
// Connection request actions
// EXTRACTED FROM: profile/[id].tsx lines 128-168

import { publicProfileApi } from "@/src/services/api/publicProfileApi";
import { useState } from "react";
import { Alert } from "react-native";

type ConnectionStatus = "none" | "pending" | "connected";

interface UseConnectionActionsReturn {
  processing: boolean;
  handleConnect: (currentStatus: ConnectionStatus) => Promise<void>;
}

export function useConnectionActions(
  currentUserId: string | undefined,
  dealerId: string | string[] | undefined
): UseConnectionActionsReturn {
  const [processing, setProcessing] = useState(false);

  const handleConnect = async (currentStatus: ConnectionStatus) => {
    if (!currentUserId || !dealerId) {
      console.log("⚠️ Missing userId or dealerId");
      return;
    }

    const id = Array.isArray(dealerId) ? dealerId[0] : dealerId;

    console.log(`🔄 Handle connect called with status: ${currentStatus}`);
    setProcessing(true);

    try {
      if (currentStatus === "none") {
        console.log("📤 Sending connection request...");
        await publicProfileApi.sendConnectionRequest(currentUserId, id);
        console.log("✅ Request sent");

      } else if (currentStatus === "pending") {
        console.log("🚫 Canceling connection request...");
        await publicProfileApi.cancelConnectionRequest(currentUserId, id);
        console.log("✅ Request canceled");
      }

    } catch (error) {
      console.error("❌ Connection action error:", error);
      Alert.alert("Error", "Could not update connection.");

    } finally {
      setProcessing(false);
    }
  };

  return {
    processing,
    handleConnect,
  };
}