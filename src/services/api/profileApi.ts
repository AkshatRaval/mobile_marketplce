import { supabase } from "@/src/supabaseConfig";
import type { Product, UserProfile } from "@/src/types/index";

export const profileApi = {
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
        photoURL: data.photo_url || null,
        email: data.email || "",
        phone: data.phone || "",
        city: data.city || "",
        role: data.role || "dealer",
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
        .eq("user_id", userId)
        .eq("status", "active")
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
        status: doc.status,
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

    const refreshData = async () => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (profileError) throw profileError;

        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (productsError) throw productsError;

        const formattedProfile = {
          uid: profile.id,
          displayName: profile.display_name,
          shopName: profile.shop_name,
          photoURL: profile.photo_url,
          email: profile.email,
          phone: profile.phone_number || profile.phone,
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
          userId: p.user_id,
          status: p.status,
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

    refreshData();

    const channel = supabase
      .channel(`profile_watch_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        () => {
          // console.log("🔔 Profile updated");
          refreshData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
          filter: `user_id=eq.${userId}`,
        },
        () => {
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToConnections: (
    connectionIds: string[],
    onUpdate: (users: any[]) => void,
    onError?: (error: Error) => void
  ) => {
    if (!connectionIds || connectionIds.length === 0) {
      onUpdate([]);
      return null;
    }
    const ids = connectionIds.slice(0, 10);
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
    return () => { };
  },

  deleteProduct: async (
    productId: string,
    userId: string,
    currentListings: any[]
  ): Promise<string[]> => {
    try {
      const { data: product } = await supabase
        .from("products")
        .select("images")
        .eq("id", productId)
        .single();

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

  updateProduct: async (
    productId: string,
    userId: string,
    updates: any,
    currentListings: any[]
  ): Promise<void> => {
    try {
      const validUpdates: any = {};

      if (updates.name !== undefined) validUpdates.name = updates.name;
      if (updates.price !== undefined) validUpdates.price = updates.price;
      if (updates.description !== undefined)
        validUpdates.description = updates.description;
      if (updates.status !== undefined) validUpdates.status = updates.status;

      const { error } = await supabase
        .from("products")
        .update(validUpdates)
        .eq("id", productId);

      if (error) throw error;
    } catch (error: any) {
      console.error("❌ Error updating product:", error);
      throw new Error("Failed to update product");
    }
  },

  updateUser: async (userId: string, data: any): Promise<void> => {
    try {
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
    } catch (error: any) {
      console.error("❌ Error updating user:", error);
      throw new Error("Failed to update user profile");
    }
  },

  signOut: async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (error: any) {
      console.error("❌ Error signing out:", error);
      throw new Error("Failed to sign out");
    }
  },

  createSalesLog: async (logData: any): Promise<any> => {
    try {
      const { data, error } = await supabase
        .from("sales_logs")
        .insert([logData])
        .select();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error("❌ Error creating sales log:", error);
      throw error;
    }
  },

  getSalesLogs: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("sales_logs")
        .select("*")
        .eq("user_id", userId)
        .order("sold_at", { ascending: false });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error("❌ Error fetching sales logs:", error);
      return [];
    }
  },
  // Replace the recordSale method in your profileApi.ts with this fixed version

  recordSale: async (item: any, saleDetails: any): Promise<boolean> => {
    try {
      // console.log("🔄 Starting sale record for product:", item.id);

      // 1. Create Log Entry
      const { data: logData, error: logError } = await supabase
        .from("sales_logs")
        .insert({
          user_id: item.userId || item.user_id,
          product_id: item.id,
          product_name: item.name,
          product_image:
            item.images && item.images.length > 0 ? item.images[0] : null,
          original_price: item.price,
          sold_price: saleDetails.soldPrice,
          sale_type: saleDetails.type,
          buyer_name: saleDetails.buyerName || null,
          buyer_phone: saleDetails.buyerPhone || null,
          imei: saleDetails.imei2
            ? `${saleDetails.imei || ""}  /  ${saleDetails.imei2}`
            : saleDetails.imei || null,
          sold_at: new Date().toISOString(),
        })
        .select();

      if (logError) {
        console.error("❌ Error creating sales log:", logError);
        throw logError;
      }

      // // console.log("✅ Sales log created:", logData);

      const { data: deletedData, error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", item.id)
        .select();

      if (deleteError) {
        console.error("❌ Error deleting product:", deleteError);
        throw deleteError;
      }

      if (!deletedData || deletedData.length === 0) {
        console.error("⚠️ No product was deleted - product might not exist");
        throw new Error("Product not found or already deleted");
      }

      // // console.log("✅ Product deleted successfully:", deletedData);
      return true;
    } catch (error: any) {
      console.error("❌ Failed to record sale:", error.message || error);
      return false;
    }
  },

  updateSalesLog: async (logId: string, updates: any): Promise<void> => {
    try {
      const validUpdates: any = {};

      if (updates.sold_price !== undefined)
        validUpdates.sold_price = updates.sold_price;
      if (updates.buyer_name !== undefined)
        validUpdates.buyer_name = updates.buyer_name;
      if (updates.buyer_phone !== undefined)
        validUpdates.buyer_phone = updates.buyer_phone;
      if (updates.imei !== undefined) validUpdates.imei = updates.imei;

      // Add edited_at timestamp
      validUpdates.edited_at = new Date().toISOString();

      const { error } = await supabase
        .from("sales_logs")
        .update(validUpdates)
        .eq("id", logId);

      if (error) throw error;
    } catch (error: any) {
      console.error("❌ Error updating sales log:", error);
      throw new Error("Failed to update sales log");
    }
  },
};
