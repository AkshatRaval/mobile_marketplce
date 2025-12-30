// src/hooks/usePublicProfile.ts
import { publicProfileApi } from "@/src/services/api/publicProfileApi";
import { useEffect, useState } from "react";

interface UsePublicProfileReturn {
  dealerData: any | null;
  inventory: any[];
  connections: any[];
  loading: boolean;
  error: string | null;
}

export function usePublicProfile(dealerId: string | string[] | undefined): UsePublicProfileReturn {
  const [dealerData, setDealerData] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Validation
      if (!dealerId) {
        console.log("⚠️ No dealer ID provided");
        setLoading(false);
        return;
      }

      const id = Array.isArray(dealerId) ? dealerId[0] : dealerId;
      
      console.log(`📥 Fetching public profile for: ${id}`);
      setLoading(true);
      setError(null);

      try {
        // 2. Fetch EVERYTHING in parallel (Faster!)
        // We don't wait for profile to finish before starting to fetch connections.
        const [profileData, inventoryData, connectionsData] = await Promise.all([
          publicProfileApi.fetchDealerProfile(id),
          publicProfileApi.fetchDealerInventory(id),
          publicProfileApi.fetchDealerConnections(id) // <--- Fixed: Just pass the ID
        ]);

        console.log("✅ Data loaded successfully");
        
        // 3. Update State
        setDealerData(profileData);
        setInventory(inventoryData);
        setConnections(connectionsData);

      } catch (err) {
        console.error("❌ Profile fetch error:", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dealerId]);

  return {
    dealerData,
    inventory,
    connections,
    loading,
    error,
  };
}