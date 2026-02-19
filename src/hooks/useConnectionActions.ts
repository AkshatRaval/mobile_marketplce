// src/hooks/useConnectionActions.ts
import { publicProfileApi } from "@/src/services/api/publicProfileApi";
import { useRef, useState } from "react";
import { Alert } from "react-native";

export type ConnectionStatus = "none" | "pending" | "connected" | "received";

interface UseConnectionActionsReturn {
  processing: boolean;
  error: string | null;
  handleConnect: (currentStatus: ConnectionStatus) => Promise<boolean>;
}

// Rate limiting configuration
const RATE_LIMIT_MS = 2000;
const requestTimestamps = new Map<string, number>();

export function useConnectionActions(
  currentUserId: string | undefined,
  dealerId: string | string[] | undefined
): UseConnectionActionsReturn {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleConnect = async (currentStatus: ConnectionStatus): Promise<boolean> => {
    if (!currentUserId || !dealerId) {
      // console.log("⚠️ Missing userId or dealerId");
      setError("Missing user information");
      return false;
    }

    const id = Array.isArray(dealerId) ? dealerId[0] : dealerId;
    const requestKey = `${currentUserId}-${id}`;

    // Rate limiting check
    const lastRequestTime = requestTimestamps.get(requestKey) || 0;
    const now = Date.now();
    
    if (now - lastRequestTime < RATE_LIMIT_MS) {
      // console.log("⏱️ Rate limit: Please wait before sending another request");
      return false;
    }

    // Prevent concurrent requests
    if (processing) {
      // console.log("⏱️ Already processing a request");
      return false;
    }

    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // console.log(`🔄 Handle connect called with status: ${currentStatus}`);
    setProcessing(true);
    setError(null);
    requestTimestamps.set(requestKey, now);

    try {
      switch (currentStatus) {
        case "none":
          // console.log("📤 Sending connection request...");
          await publicProfileApi.sendConnectionRequest(currentUserId, id);
          break;

        case "pending":
          // console.log("🚫 Canceling connection request...");
          await publicProfileApi.cancelConnectionRequest(currentUserId, id);
          break;

        case "received":
          // console.log("🤝 Accepting connection request...");
          await publicProfileApi.acceptConnectionRequest(currentUserId, id);
          break;

        case "connected":
          // Handle disconnect with confirmation
          return new Promise((resolve) => {
            Alert.alert(
              "Remove Connection",
              "Are you sure you want to disconnect? You can always reconnect later.",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => {
                    setProcessing(false);
                    resolve(false);
                  },
                },
                {
                  text: "Disconnect",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await publicProfileApi.cancelConnectionRequest(currentUserId, id);
                      setProcessing(false);
                      resolve(true);
                    } catch (err: any) {
                      console.error("❌ Disconnect error:", err);
                      setError(err.message || "Failed to disconnect");
                      Alert.alert("Error", "Could not remove connection. Please try again.");
                      setProcessing(false);
                      resolve(false);
                    }
                  },
                },
              ]
            );
          });
      }

      // console.log("✅ Connection action completed");
      return true;
    } catch (err: any) {
      console.error("❌ Connection action error:", err);
      
      // Handle specific errors
      let errorMessage = "Could not update connection.";
      
      if (err.message?.includes("already exists")) {
        errorMessage = "Connection request already sent.";
      } else if (err.message?.includes("not found")) {
        errorMessage = "User not found.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      Alert.alert("Error", errorMessage);
      return false;
    } finally {
      // Small delay to prevent rapid successive clicks
      setTimeout(() => {
        setProcessing(false);
      }, 300);
    }
  };

  return {
    processing,
    error,
    handleConnect,
  };
}