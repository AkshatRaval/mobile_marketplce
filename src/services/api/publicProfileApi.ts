// src/services/api/publicProfileApi.ts
import { supabase } from "@/src/supabaseConfig";

export const publicProfileApi = {
  
  // 1. Subscribe to Status (Real-time listener on 'connections' table)
  subscribeToConnectionStatus: (
    currentUserId: string,
    dealerId: string,
    onStatusChange: (status: "none" | "pending" | "connected" | "received") => void,
    onError?: (error: Error) => void
  ) => {
    console.log(`👂 Subscribing to connection status with ${dealerId}`);

    // Helper to fetch current status
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("connections")
          .select("*")
          .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${dealerId}),and(sender_id.eq.${dealerId},receiver_id.eq.${currentUserId})`)
          .maybeSingle(); // Returns null if no row found

        if (error) throw error;

        if (!data) {
          onStatusChange("none");
          return;
        }

        if (data.status === 'accepted') {
          onStatusChange("connected");
        } else if (data.status === 'pending') {
          if (data.sender_id === currentUserId) {
            onStatusChange("pending"); // I sent it
          } else {
            onStatusChange("received"); // They sent it
          }
        } else {
          onStatusChange("none");
        }
      } catch (err: any) {
        console.error("❌ Error checking connection status:", err);
        if (onError) onError(err);
      }
    };

    // Initial check
    checkStatus();

    // Real-time Listener
    const channel = supabase
      .channel(`connection_status_${currentUserId}_${dealerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connections",
          // Filter is tricky for OR conditions in realtime, so we listen to all changes involves these users roughly
          // Ideally, we'd filter strictly, but Supabase realtime filters are limited.
          // We'll rely on client-side filtering or just re-checking status on any connection change for these users.
          filter: `sender_id=in.(${currentUserId},${dealerId})`, 
        },
        () => checkStatus()
      )
      .subscribe();

    // We need a second listener or a smarter filter because the first one only catches if sender is involved.
    // Simpler approach: Just re-run checkStatus whenever ANY connection change happens involving this user.
    // For specific optimization, backend triggers are better, but this works for client-side.

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // 2. Fetch Profile (From 'profiles' table)
  fetchDealerProfile: async (dealerId: string): Promise<any | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", dealerId)
        .single();

      if (error) return null;

      // Map snake_case to camelCase
      return {
        uid: data.id,
        displayName: data.display_name,
        shopName: data.shop_name,
        photoURL: data.photo_url,
        role: data.role,
        onboardingStatus: data.onboarding_status,
        city: data.city,
        // ... other fields
      };
    } catch (error) {
      console.error("❌ Error fetching dealer profile:", error);
      throw new Error("Failed to fetch dealer profile");
    }
  },

  // 3. Fetch Inventory (From 'products' table)
  fetchDealerInventory: async (dealerId: string): Promise<any[]> => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("owner_id", dealerId);

      if (error) throw error;

      return data.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        description: p.description,
        images: p.images,
        userId: p.owner_id
      }));
    } catch (error) {
      console.error("❌ Error fetching inventory:", error);
      throw new Error("Failed to fetch inventory");
    }
  },

  // 4. Fetch Connections
  fetchDealerConnections: async (dealerId: string): Promise<any[]> => {
    try {
      console.log(`👥 Finding friends for: ${dealerId}`);

      // Step A: Find accepted connections
      const { data: connections, error } = await supabase
        .from("connections")
        .select("sender_id, receiver_id")
        .eq("status", "accepted")
        .or(`sender_id.eq.${dealerId},receiver_id.eq.${dealerId}`);

      if (error) throw error;

      if (!connections || connections.length === 0) return [];

      // Step B: Extract Friend IDs
      const friendIds = connections.map(c => 
        c.sender_id === dealerId ? c.receiver_id : c.sender_id
      );

      if (friendIds.length === 0) return [];

      // Step C: Fetch Profiles (Limit 10)
      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", friendIds.slice(0, 10));

      if (usersError) throw usersError;

      return users.map((u) => ({
        uid: u.id,
        displayName: u.display_name,
        photoURL: u.photo_url,
        shopName: u.shop_name,
      }));

    } catch (error) {
      console.error("❌ Error fetching connections:", error);
      throw new Error("Failed to fetch connections");
    }
  },

  // 5. Send Request
  sendConnectionRequest: async (
    currentUserId: string,
    dealerId: string
  ): Promise<void> => {
    try {
      console.log(`📤 Sending connection request to ${dealerId}`);
      
      const { error } = await supabase
        .from("connections")
        .insert({
          sender_id: currentUserId,
          receiver_id: dealerId,
          status: "pending",
          users: [currentUserId, dealerId] // kept for array searching compatibility if needed
        });

      if (error) throw error;

      console.log("✅ Connection request sent");
    } catch (error) {
      console.error("❌ Error sending connection request:", error);
      throw new Error("Failed to send connection request");
    }
  },

  // 6. Accept Request
  acceptConnectionRequest: async (
    currentUserId: string, // Receiver (Me)
    senderId: string       // Sender (Them)
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from("connections")
        .update({ status: "accepted" })
        .eq("sender_id", senderId)
        .eq("receiver_id", currentUserId);

      if (error) throw error;
    } catch (error) {
      console.error("❌ Error accepting request:", error);
      throw error;
    }
  },

  // 7. Cancel / Unfriend
  cancelConnectionRequest: async (
    currentUserId: string,
    dealerId: string
  ): Promise<void> => {
    try {
      console.log(`🚫 Removing connection with ${dealerId}`);
      
      const { error } = await supabase
        .from("connections")
        .delete()
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${dealerId}),and(sender_id.eq.${dealerId},receiver_id.eq.${currentUserId})`);

      if (error) throw error;

      console.log("✅ Connection removed");
    } catch (error) {
      console.error("❌ Error canceling connection request:", error);
      throw new Error("Failed to cancel connection request");
    }
  },
};