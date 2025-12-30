// src/hooks/useConnectionStatus.ts
import { publicProfileApi } from "@/src/services/api/publicProfileApi";
import { useEffect, useState } from "react";

export type ConnectionStatus = "none" | "pending" | "connected" | "received";

interface UseConnectionStatusReturn {
  status: ConnectionStatus;
  loading: boolean;
  setStatus: React.Dispatch<React.SetStateAction<ConnectionStatus>>;
}

export function useConnectionStatus(
  currentUserId: string | undefined,
  dealerId: string | string[] | undefined
): UseConnectionStatusReturn {
  const [status, setStatus] = useState<ConnectionStatus>("none");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // If IDs are missing, stop here
    if (!currentUserId || !dealerId) {
      setLoading(false);
      return;
    }

    const id = Array.isArray(dealerId) ? dealerId[0] : dealerId;
    setLoading(true);

    console.log(`🔌 Setting up connection status subscription for ${id}`);

    const unsubscribe = publicProfileApi.subscribeToConnectionStatus(
      currentUserId,
      id,
      (newStatus) => {
        // newStatus can be 'none' | 'pending' | 'connected' | 'received'
        setStatus(newStatus as ConnectionStatus);
        setLoading(false);
      },
      (error) => {
        console.error("❌ Connection status error:", error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUserId, dealerId]);

  return { status, loading, setStatus };
}