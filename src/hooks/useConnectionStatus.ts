// src/hooks/useConnectionStatus.ts
// Real-time connection status tracking
// EXTRACTED FROM: profile/[id].tsx lines 64-87

import { publicProfileApi } from "@/src/services/api/publicProfileApi";
import { useEffect, useState } from "react";

type ConnectionStatus = "none" | "pending" | "connected";

interface UseConnectionStatusReturn {
  status: ConnectionStatus;
}

export function useConnectionStatus(
  currentUserId: string | undefined,
  dealerId: string | string[] | undefined
): UseConnectionStatusReturn {
  const [status, setStatus] = useState<ConnectionStatus>("none");

  useEffect(() => {
    if (!currentUserId || !dealerId) {
      console.log("⚠️ Missing userId or dealerId for connection status");
      return;
    }

    const id = Array.isArray(dealerId) ? dealerId[0] : dealerId;

    console.log(`🔌 Setting up connection status subscription for ${id}`);

    const unsubscribe = publicProfileApi.subscribeToConnectionStatus(
      currentUserId,
      id,
      (newStatus) => {
        console.log(`📊 Connection status updated: ${newStatus}`);
        setStatus(newStatus);
      },
      (error) => {
        console.error("❌ Connection status error:", error);
      }
    );

    return () => {
      console.log("🔌 Cleaning up connection status subscription");
      unsubscribe();
    };
  }, [currentUserId, dealerId]);

  return { status };
}