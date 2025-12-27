// src/services/api/userApi.ts
// Handles ALL user profile operations - FIXED

import { db } from "@/FirebaseConfig";
import type { UserProfile } from "@/src/types";
import {
    collection,
    doc,
    documentId,
    getDoc,
    getDocs,
    query,
    where,
} from "firebase/firestore";

export const userApi = {
  /**
   * Get single user profile by ID
   */
  getUserById: async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log(`👤 Fetching user profile: ${userId}`);

      const userDocSnap = await getDoc(doc(db, "users", userId));

      if (!userDocSnap.exists()) {
        console.log("❌ User not found");
        return null;
      }

      const userData = userDocSnap.data();
      console.log("✅ User profile fetched");

      // ✅ FIXED: No duplicate uid
      return {
        uid: userDocSnap.id,
        displayName: userData.displayName || "Unknown",
        email: userData.email,
        photoURL: userData.photoURL,
        phoneNumber: userData.phoneNumber,
        phone: userData.phone,
        mobile: userData.mobile,
        city: userData.city,
        requestReceived: userData.requestReceived,
        connections: userData.connections,
        listings: userData.listings,
      };

    } catch (error) {
      console.error("❌ Error fetching user:", error);
      throw new Error("Failed to fetch user profile");
    }
  },

  /**
   * Get user's phone number for WhatsApp
   */
  getUserPhoneNumber: async (userId: string): Promise<string | null> => {
    try {
      console.log(`📞 Fetching phone number for user: ${userId}`);

      const userDocSnap = await getDoc(doc(db, "users", userId));

      if (!userDocSnap.exists()) {
        console.log("❌ User not found");
        return null;
      }

      const userData = userDocSnap.data();

      // Check common field names
      const rawPhone = 
        userData.phoneNumber || 
        userData.phone || 
        userData.mobile;

      if (!rawPhone) {
        console.log("❌ No phone number found");
        return null;
      }

      // Sanitize and format
      let phone = rawPhone.replace(/[^\d]/g, "");

      // Add country code if 10 digits (default to India +91)
      if (phone.length === 10) {
        phone = "91" + phone;
      }

      console.log("✅ Phone number retrieved");
      return phone;

    } catch (error) {
      console.error("❌ Error fetching phone number:", error);
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

      // Firebase 'in' query limit is 10
      const safeIds = userIds.slice(0, 10);

      console.log(`👥 Fetching ${safeIds.length} user profiles...`);

      const q = query(
        collection(db, "users"),
        where(documentId(), "in", safeIds)
      );

      const snap = await getDocs(q);

      const users: UserProfile[] = snap.docs.map((d) => {
        const data = d.data();
        // ✅ FIXED: No duplicate uid
        return {
          uid: d.id,
          displayName: data.displayName || "Unknown",
          email: data.email,
          photoURL: data.photoURL,
          phoneNumber: data.phoneNumber,
          phone: data.phone,
          mobile: data.mobile,
          city: data.city,
          requestReceived: data.requestReceived,
          connections: data.connections,
          listings: data.listings,
        };
      });

      console.log(`✅ Fetched ${users.length} profiles`);
      return users;

    } catch (error) {
      console.error("❌ Error fetching user profiles:", error);
      throw new Error("Failed to fetch user profiles");
    }
  },

  /**
   * Get fresh user data (for refreshing)
   */
  getFreshUserData: async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log(`🔄 Refreshing user data: ${userId}`);

      const userSnapshot = await getDoc(doc(db, "users", userId));

      if (!userSnapshot.exists()) {
        return null;
      }

      const data = userSnapshot.data();

      console.log("✅ Fresh user data retrieved");

      // ✅ FIXED: No duplicate uid
      return {
        uid: userSnapshot.id,
        displayName: data.displayName || "Unknown",
        email: data.email,
        photoURL: data.photoURL,
        phoneNumber: data.phoneNumber,
        phone: data.phone,
        mobile: data.mobile,
        city: data.city,
        requestReceived: data.requestReceived,
        connections: data.connections,
        listings: data.listings,
      };

    } catch (error) {
      console.error("❌ Error refreshing user data:", error);
      throw new Error("Failed to refresh user data");
    }
  },
};