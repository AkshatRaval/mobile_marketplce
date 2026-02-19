// src/hooks/useConnectionStatus.ts
import { publicProfileApi } from "@/src/services/api/publicProfileApi";
import { useCallback, useEffect, useState } from "react";

export type ConnectionStatus = "none" | "pending" | "connected" | "received";

interface UseConnectionStatusReturn {
  status: ConnectionStatus;
  loading: boolean;
  setStatus: React.Dispatch<React.SetStateAction<ConnectionStatus>>;
  refresh: () => Promise<void>;
}

export function useConnectionStatus(
  currentUserId: string | undefined,
  dealerId: string | string[] | undefined
): UseConnectionStatusReturn {
  const [status, setStatus] = useState<ConnectionStatus>("none");
  const [loading, setLoading] = useState<boolean>(true);

  const id = Array.isArray(dealerId) ? dealerId[0] : dealerId;

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (!currentUserId || !id) return;
    
    console.log("🔄 Manually refreshing connection status...");
    setLoading(true);
    
    try {
      const newStatus = await publicProfileApi.checkConnectionStatus(currentUserId, id);
      setStatus(newStatus);
      console.log(`✅ Manual refresh complete: ${newStatus}`);
    } catch (error) {
      console.error("❌ Manual refresh failed:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, id]);

  useEffect(() => {
    // If IDs are missing, stop here
    if (!currentUserId || !id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = publicProfileApi.subscribeToConnectionStatus(
      currentUserId,
      id,
      (newStatus) => {
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
  }, [currentUserId, id]);

  return { status, loading, setStatus, refresh };
}