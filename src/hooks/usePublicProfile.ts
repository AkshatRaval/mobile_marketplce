// src/hooks/usePublicProfile.ts
// UPDATED - Now fetches connections too

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
      try {
        if (!dealerId) {
          console.log("⚠️ No dealer ID provided");
          setLoading(false);
          return;
        }

        const id = Array.isArray(dealerId) ? dealerId[0] : dealerId;
        
        console.log(`📥 Fetching public profile for: ${id}`);
        setLoading(true);
        setError(null);

        // Fetch dealer profile
        const profile = await publicProfileApi.fetchDealerProfile(id);
        console.log("Profile fetched:", profile);
        setDealerData(profile);

        // Fetch inventory
        const products = await publicProfileApi.fetchDealerInventory(id);
        console.log(`Inventory fetched: ${products.length} items`);
        setInventory(products);

        // Fetch connections if dealer has any
        if (profile?.connections && profile.connections.length > 0) {
          console.log(`Fetching ${profile.connections.length} connections...`);
          const connectionUsers = await publicProfileApi.fetchDealerConnections(
            profile.connections
          );
          console.log(`Connections fetched: ${connectionUsers.length} users`);
          setConnections(connectionUsers);
        } else {
          console.log("No connections to fetch");
          setConnections([]);
        }

        console.log("✅ Profile data loaded successfully");

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