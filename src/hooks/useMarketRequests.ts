// src/hooks/useMarketRequests.ts
// Manages real-time market requests data
// EXTRACTED FROM: requests.tsx useEffect (lines 39-58)

import { requestApi } from "@/src/services/api/requestApi";
import type { MarketRequest } from "@/src/types";
import { useEffect, useState } from "react";

interface UseMarketRequestsReturn {
  requests: MarketRequest[];
  loading: boolean;
  error: string | null;
}

export function useMarketRequests(): UseMarketRequestsReturn {
  const [requests, setRequests] = useState<MarketRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("🔌 Setting up market requests subscription...");

    // Subscribe to real-time updates
    const unsubscribe = requestApi.subscribeToRequests(
      (fetchedRequests) => {
        setRequests(fetchedRequests);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error("Error fetching requests:", error);
        setError(error.message);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      console.log("🔌 Cleaning up market requests subscription...");
      unsubscribe();
    };
  }, []);

  return {
    requests,
    loading,
    error,
  };
}