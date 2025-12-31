// src/services/api/requestApi.ts
// Handles ALL Supabase market request operations

import { supabase } from "@/src/supabaseConfig";
import type { MarketRequest } from "@/src/types";

export const requestApi = {
  /**
   * Create a new market request
   */
  createRequest: async (requestData: {
    title: string;
    budget: string;
    description: string;
    dealer_id: string;   // Changed to snake_case to match typical DB calls, but mapping happens inside
    dealer_name: string; 
  }): Promise<string> => {
    try {
      console.log("📝 Creating market request...");

      const { data, error } = await supabase
        .from("requests")
        .insert({
          title: requestData.title,
          budget: Number(requestData.budget), // Convert string to number for numeric column
          description: requestData.description,
          dealer_id: requestData.dealer_id,
          dealer_name: requestData.dealer_name,
          status: "open",
          // created_at is handled automatically by default value
        })
        .select("id")
        .single();

      if (error) throw error;

      console.log("✅ Market request created:", data.id);
      return data.id;

    } catch (error: any) {
      console.error("❌ Error creating request:", error.message);
      throw new Error("Failed to create market request");
    }
  },

  /**
   * Subscribe to real-time market requests
   */
  subscribeToRequests: (
    onUpdate: (requests: MarketRequest[]) => void,
    onError?: (error: Error) => void
  ) => {
    console.log("👂 Subscribing to market requests...");

    // 1. Helper to fetch data
    const fetchRequests = async () => {
      try {
        const { data, error } = await supabase
          .from("requests")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Map Supabase rows to MarketRequest type
        const requests: MarketRequest[] = data.map((row) => ({
          id: row.id,
          title: row.title,
          budget: String(row.budget), // Convert numeric back to string for UI
          description: row.description || "",
          dealerName: row.dealer_name || "Unknown",
          dealerId: row.dealer_id,
          // Convert ISO timestamp string to number (ms) to match previous Firebase behavior
          createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          status: row.status || "open",
        }));

        onUpdate(requests);
      } catch (err: any) {
        console.error("❌ Error fetching requests:", err.message);
        if (onError) onError(err);
      }
    };

    // 2. Initial Fetch
    fetchRequests();

    // 3. Real-time Listener
    const channel = supabase
      .channel("market_requests_feed")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen for INSERT, UPDATE, DELETE
          schema: "public",
          table: "requests",
        },
        () => {
          console.log("🔔 Market requests updated, refreshing...");
          fetchRequests();
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Delete a market request
   */
  deleteRequest: async (requestId: string): Promise<void> => {
    try {
      console.log("🗑️ Deleting request:", requestId);

      const { error } = await supabase
        .from("requests")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      console.log("✅ Request deleted");
    } catch (error: any) {
      console.error("❌ Error deleting request:", error.message);
      throw new Error("Failed to delete request");
    }
  },
};