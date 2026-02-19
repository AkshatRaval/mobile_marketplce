// src/services/api/publicProfileApi.ts
import { supabase } from "@/src/supabaseConfig";
import { Product } from "@/src/types";

export const publicProfileApi = {
  // Manual status check (for force refresh)
  checkConnectionStatus: async (
    currentUserId: string,
    dealerId: string
  ): Promise<"none" | "pending" | "connected" | "received"> => {
    try {
      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${dealerId}),and(sender_id.eq.${dealerId},receiver_id.eq.${currentUserId})`
        )
        .maybeSingle();

      if (error) throw error;

      if (!data) return "none";

      if (data.status === "accepted") {
        return "connected";
      } else if (data.status === "pending") {
        if (data.sender_id === currentUserId) {
          return "pending";
        } else {
          return "received";
        }
      }
      
      return "none";
    } catch (error) {
      console.error("❌ Error checking status:", error);
      return "none";
    }
  },

  // 1. Subscribe to Status (Real-time listener on 'connections' table)
  subscribeToConnectionStatus: (
    currentUserId: string,
    dealerId: string,
    onStatusChange: (
      status: "none" | "pending" | "connected" | "received"
    ) => void,
    onError?: (error: Error) => void
  ) => {
    // Helper to fetch current status
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("connections")
          .select("*")
          .or(
            `and(sender_id.eq.${currentUserId},receiver_id.eq.${dealerId}),and(sender_id.eq.${dealerId},receiver_id.eq.${currentUserId})`
          )
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          onStatusChange("none");
          return;
        }

        if (data.status === "accepted") {
          onStatusChange("connected");
        } else if (data.status === "pending") {
          if (data.sender_id === currentUserId) {
            onStatusChange("pending");
          } else {
            onStatusChange("received");
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

    // Real-time Listener - Listen to BOTH sender and receiver changes
    const channel = supabase
      .channel(`connection_status_${currentUserId}_${dealerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connections",
          filter: `sender_id=in.(${currentUserId},${dealerId})`,
        },
        (payload) => {
          // console.log("🔔 Connection change detected:", payload);
          checkStatus();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connections",
          filter: `receiver_id=in.(${currentUserId},${dealerId})`,
        },
        (payload) => {
          // console.log("🔔 Connection change detected (receiver):", payload);
          checkStatus();
        }
      )
      .subscribe();

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

      return {
        uid: data.id,
        displayName: data.display_name,
        shopName: data.shop_name,
        photoURL: data.photo_url,
        role: data.role,
        onboardingStatus: data.onboarding_status,
        city: data.city,
        phoneNumber: data.phone_number,
        privacySettings: data.privacy_settings || "Everyone",
      };
    } catch (error) {
      console.error("❌ Error fetching dealer profile:", error);
      throw new Error("Failed to fetch dealer profile");
    }
  },

  // 3. Fetch Inventory (From 'products' table)
  fetchDealerInventory: async (dealerId: string): Promise<Product[]> => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", dealerId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((doc: any) => ({
        id: doc.id,
        userId: doc.user_id,
        name: doc.name,
        price: doc.price,
        description: doc.description,
        images: doc.images || [],
        image: doc.images?.[0] || null,
        createdAt: doc.created_at
          ? new Date(doc.created_at).getTime()
          : Date.now(),
        dealerName: "",
        city: "",
      }));
    } catch (error: any) {
      console.error("❌ Profile fetch error:", error.message);
      throw new Error("Failed to fetch inventory");
    }
  },

  // 4. Fetch Connections
  fetchDealerConnections: async (dealerId: string): Promise<any[]> => {
    try {
      const { data: connections, error } = await supabase
        .from("connections")
        .select("sender_id, receiver_id")
        .eq("status", "accepted")
        .or(`sender_id.eq.${dealerId},receiver_id.eq.${dealerId}`);

      if (error) throw error;

      if (!connections || connections.length === 0) return [];

      const friendIds = connections.map((c) =>
        c.sender_id === dealerId ? c.receiver_id : c.sender_id
      );

      if (friendIds.length === 0) return [];

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

  // 5. Send Request (with duplicate check)
  sendConnectionRequest: async (
    currentUserId: string,
    dealerId: string
  ): Promise<void> => {
    try {
      // console.log(`📤 Sending connection request to ${dealerId}`);

      // First, check if a connection already exists
      const { data: existing, error: checkError } = await supabase
        .from("connections")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${dealerId}),and(sender_id.eq.${dealerId},receiver_id.eq.${currentUserId})`
        )
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        // console.log("⚠️ Connection already exists");
        throw new Error("Connection request already exists");
      }

      // Insert new connection
      const { error } = await supabase.from("connections").insert({
        sender_id: currentUserId,
        receiver_id: dealerId,
        status: "pending",
        users: [currentUserId, dealerId],
      });

      if (error) {
        // Handle duplicate key error specifically
        if (error.code === "23505") {
          throw new Error("Connection request already exists");
        }
        throw error;
      }

      // console.log("✅ Connection request sent");
      
      // Small delay to ensure DB has committed before real-time triggers
      await new Promise(resolve => setTimeout(resolve, 150));
    } catch (error: any) {
      console.error("❌ Error sending connection request:", error);
      throw error;
    }
  },

  // 6. Accept Request
  acceptConnectionRequest: async (
    currentUserId: string,
    senderId: string
  ): Promise<void> => {
    try {
      // console.log(`🤝 Accepting connection request from ${senderId}`);
      
      const { error } = await supabase
        .from("connections")
        .update({ status: "accepted" })
        .eq("sender_id", senderId)
        .eq("receiver_id", currentUserId)
        .eq("status", "pending"); // Only update if still pending

      if (error) throw error;
      
      // console.log("✅ Connection request accepted");
    } catch (error) {
      console.error("❌ Error accepting request:", error);
      throw error;
    }
  },

  // Check if user is in selected connections
  checkSelectedConnection: async (
    profileOwnerId: string,
    viewerId: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("selected_connections")
        .select("id")
        .eq("user_id", profileOwnerId)
        .eq("selected_user_id", viewerId)
        .maybeSingle();

      if (error) throw error;
      
      return !!data; // Returns true if found, false if not
    } catch (error) {
      console.error("❌ Error checking selected connection:", error);
      return false;
    }
  },

  // 7. Cancel / Unfriend
  cancelConnectionRequest: async (
    currentUserId: string,
    dealerId: string
  ): Promise<void> => {
    try {
      // console.log(`🚫 Removing connection with ${dealerId}`);

      const { error } = await supabase
        .from("connections")
        .delete()
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${dealerId}),and(sender_id.eq.${dealerId},receiver_id.eq.${currentUserId})`
        );

      if (error) throw error;

      // console.log("✅ Connection removed");
    } catch (error) {
      console.error("❌ Error canceling connection request:", error);
      throw new Error("Failed to cancel connection request");
    }
  },
};