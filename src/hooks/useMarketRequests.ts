import { requestApi } from "@/src/services/api/requestApi";
import { supabase } from "@/src/supabaseConfig";
import type { MarketRequest } from "@/src/types";
import { useCallback, useEffect, useState } from "react";

interface UseMarketRequestsReturn {
  requests: MarketRequest[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMarketRequests(): UseMarketRequestsReturn {
  const [requests, setRequests] = useState<MarketRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ FIXED: Manual Refetch Function
  const refetch = useCallback(async () => {
    // console.log("🔄 Manual refetching requests...");
    
    try {
      // ✅ FIX 1: Changed table name from 'market_requests' to 'requests'
      const { data, error: fetchError } = await supabase
        .from("requests") 
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      if (data) {
        // ✅ FIX 2: Added safe mapping to handle different column names
        const formattedData = data.map((item: any) => ({
            id: item.id,
            title: item.title,
            budget: item.budget,
            description: item.description,
            // Handle both common naming conventions just in case
            dealerId: item.dealer_id || item.user_id, 
            dealerName: item.dealer_name || item.user_name || "Unknown",
            status: item.status,
            createdAt: item.created_at,
        })) as MarketRequest[];
        
        setRequests(formattedData);
      }
      setError(null);
    } catch (err: any) {
      console.error("Error refetching requests:", err);
      setError(err.message);
    }
  }, []);

  // 2. Real-time Subscription (Unchanged)
  useEffect(() => {
    // console.log("🔌 Setting up requests subscription...");

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

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  return {
    requests,
    loading,
    error,
    refetch,
  };
}