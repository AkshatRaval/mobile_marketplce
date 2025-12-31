import { supabase } from "@/src/supabaseConfig";
import type { Product, UserProfile } from "@/src/types/index";

export const profileApi = {
  /**
   * Get User Profile by ID (One-time fetch)
   */
  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      // @ts-ignore
      return {
        uid: data.id,
        displayName: data.display_name || "",
        shopName: data.shop_name || "",
        photoURL: data.photo_url || null, // Allow null for photos usually
        email: data.email || "",
        phone: data.phone || "",
        city: data.city || "",
        role: data.role || "dealer", // Default role fallback
        privacySettings: data.privacy_settings || "Everyone",
        onboardingStatus: data.onboarding_status || "submitted",
      } as UserProfile;
    } catch (error: any) {
      console.error("❌ Error fetching profile:", error.message);
      return null;
    }
  },

  /**
   * Get User Posts (One-time fetch)
   */
  getUserPosts: async (userId: string): Promise<Product[]> => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", userId) // ✅ FIXED: matches DB column
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((doc: any) => ({
        id: doc.id,
        userId: doc.user_id, // ✅ FIXED
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
      console.error("❌ Error fetching user posts:", error.message);
      return [];
    }
  },

  /**
   * Subscribe to user profile AND their listings (Real-time)
   */
  subscribeToProfile: (
    userId: string,
    onUpdate: (profileData: any, listings: any[]) => void,
    onError?: (error: Error) => void
  ) => {
    let profileCache: any = null;
    let listingsCache: any[] = [];

    // Helper to fetch latest data and update UI
    const refreshData = async () => {
      try {
        // 1. Fetch Profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (profileError) throw profileError;

        // 2. Fetch Listings (Products)
        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("*")
          .eq("user_id", userId) // ✅ FIXED: Changed owner_id to user_id
          .order("created_at", { ascending: false });

        if (productsError) throw productsError;

        // Map snake_case to camelCase for frontend compatibility
        const formattedProfile = {
          uid: profile.id,
          displayName: profile.display_name,
          shopName: profile.shop_name,
          photoURL: profile.photo_url,
          email: profile.email,
          phone: profile.phone,
          city: profile.city,
          role: profile.role,
          privacySettings: profile.privacy_settings,
          onboardingStatus: profile.onboarding_status,
        };

        const formattedListings = products.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          description: p.description,
          images: p.images || [],
          // Map back to format UI expects
          userId: p.user_id, // ✅ FIXED: Changed owner_id to user_id
          createdAt: p.created_at
            ? new Date(p.created_at).getTime()
            : Date.now(),
        }));

        profileCache = formattedProfile;
        listingsCache = formattedListings;

        onUpdate(formattedProfile, formattedListings);
      } catch (err: any) {
        console.error("❌ Error fetching profile data:", err);
        if (onError) onError(err);
      }
    };

    // Initial Fetch
    refreshData();

    // 3. Set up Real-time Listeners
    const channel = supabase
      .channel(`profile_watch_${userId}`)
      // Listen for profile changes
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        () => {
          console.log("🔔 Profile updated, refreshing...");
          refreshData();
        }
      )
      // Listen for product changes (listings)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
          filter: `user_id=eq.${userId}`, // ✅ FIXED: Changed owner_id to user_id
        },
        () => {
          console.log("🔔 Listings updated, refreshing...");
          refreshData();
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Subscribe to a list of connection user IDs
   */
  subscribeToConnections: (
    connectionIds: string[],
    onUpdate: (users: any[]) => void,
    onError?: (error: Error) => void
  ) => {
    if (!connectionIds || connectionIds.length === 0) {
      onUpdate([]);
      return null;
    }

    const ids = connectionIds.slice(0, 10); // Limit to 10 for safety

    const fetchConnections = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .in("id", ids);

        if (error) throw error;

        const formattedUsers = data.map((u) => ({
          uid: u.id,
          displayName: u.display_name,
          shopName: u.shop_name,
          photoURL: u.photo_url,
          city: u.city,
        }));

        onUpdate(formattedUsers);
      } catch (err: any) {
        if (onError) onError(err);
      }
    };

    fetchConnections();
    return () => {};
  },

  /**
   * Delete a product listing
   */
  deleteProduct: async (
    productId: string,
    userId: string,
    currentListings: any[]
  ): Promise<string[]> => {
    try {
      // 1. Get image URLs first
      const { data: product } = await supabase
        .from("products")
        .select("images")
        .eq("id", productId)
        .single();

      // 2. Delete the row
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;

      return product?.images || [];
    } catch (error: any) {
      console.error("❌ Error deleting product:", error);
      throw new Error("Failed to delete product");
    }
  },

  /**
   * Update product details
   */
  updateProduct: async (
    productId: string,
    userId: string,
    updates: {
      name: string;
      price: string;
      description: string;
    },
    currentListings: any[]
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", productId);

      if (error) throw error;
    } catch (error: any) {
      console.error("❌ Error updating product:", error);
      throw new Error("Failed to update product");
    }
  },

  /**
   * Update User Profile (Photo, Privacy, etc.)
   */
  updateUser: async (userId: string, data: any): Promise<void> => {
    try {
      console.log(`👤 Updating user ${userId}...`);

      const dbUpdates: any = {};
      if (data.photoURL !== undefined) dbUpdates.photo_url = data.photoURL;
      if (data.privacySettings !== undefined)
        dbUpdates.privacy_settings = data.privacySettings;
      if (data.displayName !== undefined)
        dbUpdates.display_name = data.displayName;
      if (data.shopName !== undefined) dbUpdates.shop_name = data.shopName;

      const { error } = await supabase
        .from("profiles")
        .update(dbUpdates)
        .eq("id", userId);

      if (error) throw error;
      console.log("✅ User updated successfully");
    } catch (error: any) {
      console.error("❌ Error updating user:", error);
      throw new Error("Failed to update user profile");
    }
  },

  /**
   * Sign out user
   */
  signOut: async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (error: any) {
      console.error("❌ Error signing out:", error);
      throw new Error("Failed to sign out");
    }
  },

  /**
   * Log a Sale
   */
  logSale: async (
    userId: string,
    product: any,
    saleDetails: {
      type: "fast" | "detailed";
      soldPrice: string;
      buyerName?: string;
      imei1?: string;
      imei2?: string;
      notes?: string;
    }
  ): Promise<void> => {
    try {
      // 1. Insert into Sales Table
      const { error: saleError } = await supabase.from("sales").insert({
        seller_id: userId,
        product_name: product.name,
        sold_price: Number(saleDetails.soldPrice),
        buyer_name: saleDetails.buyerName,
        imei1: saleDetails.imei1,
        imei2: saleDetails.imei2,
        notes: saleDetails.notes,
      });

      if (saleError) throw saleError;

      // 2. Delete from Products Table
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (deleteError) throw deleteError;

      console.log("✅ Sale logged successfully");
    } catch (error: any) {
      console.error("❌ Error logging sale:", error);
      throw new Error("Failed to log sale");
    }
  },
};
