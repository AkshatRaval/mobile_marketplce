// src/hooks/useConnectionActions.ts
import { publicProfileApi } from "@/src/services/api/publicProfileApi";
import { useState } from "react";
import { Alert } from "react-native";

// Must match the type in useConnectionStatus.ts
export type ConnectionStatus = "none" | "pending" | "connected" | "received";

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
      // 1. Send Request
      if (currentStatus === "none") {
        console.log("📤 Sending connection request...");
        await publicProfileApi.sendConnectionRequest(currentUserId, id);
        
      // 2. Cancel Sent Request
      } else if (currentStatus === "pending") {
        console.log("🚫 Canceling connection request...");
        await publicProfileApi.cancelConnectionRequest(currentUserId, id);

      // 3. Accept Received Request (New Logic)
      } else if (currentStatus === "received") {
        console.log("🤝 Accepting connection request...");
        await publicProfileApi.acceptConnectionRequest(currentUserId, id);

      // 4. Unfriend (Uses the same delete function as cancel)
      } else if (currentStatus === "connected") {
        Alert.alert(
          "Disconnect",
          "Are you sure you want to remove this connection?",
          [
            { text: "Cancel", style: "cancel", onPress: () => setProcessing(false) },
            { 
              text: "Disconnect", 
              style: "destructive", 
              onPress: async () => {
                 await publicProfileApi.cancelConnectionRequest(currentUserId, id);
                 setProcessing(false);
              }
            }
          ]
        );
        return;
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