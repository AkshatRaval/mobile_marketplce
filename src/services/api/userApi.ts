// src/services/api/userApi.ts
// Handles ALL user profile operations - Supabase Version

import { supabase } from "@/src/supabaseConfig";
import type { UserProfile } from "@/src/types";

export const userApi = {
  /**
   * Get single user profile by ID
   */
  getUserById: async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log(`👤 Fetching user profile: ${userId}`);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !data) {
        console.log("❌ User not found or error:", error?.message);
        return null;
      }

      console.log("✅ User profile fetched");

      // Map snake_case database fields to camelCase UserProfile type
      return {
        uid: data.id,
        displayName: data.display_name || "Unknown",
        email: data.email,
        photoURL: data.photo_url,
        phone: data.phone,
        phoneNumber: data.phone,
        mobile: data.phone,
        city: data.city,
        // ✅ FIXED: Added missing 'privacy' field mapping
        privacy: data.privacy_settings || "Everyone", 
        listings: [],
      };

    } catch (error: any) {
      console.error("❌ Error fetching user:", error.message);
      throw new Error("Failed to fetch user profile");
    }
  },

  /**
   * Get user's phone number for WhatsApp
   */
  getUserPhoneNumber: async (userId: string): Promise<string | null> => {
    try {
      console.log(`📞 Fetching phone number for user: ${userId}`);

      const { data, error } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", userId)
        .single();

      if (error || !data || !data.phone) {
        console.log("❌ User or phone not found");
        return null;
      }

      const rawPhone = data.phone;

      // Sanitize and format
      let phone = rawPhone.replace(/[^\d]/g, "");

      // Add country code if 10 digits (default to India +91)
      if (phone.length === 10) {
        phone = "91" + phone;
      }

      console.log("✅ Phone number retrieved");
      return phone;

    } catch (error: any) {
      console.error("❌ Error fetching phone number:", error.message);
      throw new Error("Failed to fetch phone number");
    }
  },

  /**
   * Get multiple user profiles by IDs
   */
  getUsersByIds: async (userIds: string[]): Promise<UserProfile[]> => {
    try {
      if (userIds.length === 0) {
        return [];
      }

      const safeIds = userIds.slice(0, 10);
      console.log(`👥 Fetching ${safeIds.length} user profiles...`);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("id", safeIds);

      if (error) throw error;

      const users: UserProfile[] = data.map((d) => ({
        uid: d.id,
        displayName: d.display_name || "Unknown",
        email: d.email,
        photoURL: d.photo_url,
        phone: d.phone,
        phoneNumber: d.phone,
        mobile: d.phone,
        city: d.city,
        // ✅ FIXED: Added missing 'privacy' field mapping
        privacy: d.privacy_settings || "Everyone",
        listings: [],
      }));

      console.log(`✅ Fetched ${users.length} profiles`);
      return users;

    } catch (error: any) {
      console.error("❌ Error fetching user profiles:", error.message);
      throw new Error("Failed to fetch user profiles");
    }
  },

  /**
   * Get fresh user data (for refreshing)
   */
  getFreshUserData: async (userId: string): Promise<UserProfile | null> => {
    return userApi.getUserById(userId);
  },
};