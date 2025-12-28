// src/services/api/profileApi.ts
// ALL Firebase profile operations
// EXTRACTED FROM: profile.tsx lines 162-296

import { auth, db } from "@/FirebaseConfig";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  Unsubscribe,
  updateDoc,
  where,
} from "firebase/firestore";

export const profileApi = {
  /**
   * Subscribe to user profile real-time updates
   * EXTRACTED FROM: profile.tsx lines 162-176
   * 
   * LINE 163: if (!user?.uid) return;
   * LINE 164: const unsub = onSnapshot(doc(db, "users", user.uid), ...)
   * LINE 165-172: Process profile data and listings
   */
  subscribeToProfile: (
    userId: string,
    onUpdate: (profileData: any, listings: any[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe => {
    // console.log(`👂 Subscribing to profile: ${userId}`);

    const unsubscribe = onSnapshot(
      doc(db, "users", userId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // LINE 169: setProfileData(data);
          // LINE 170: setListings([...(data.listings || [])].reverse());
          const listings = [...(data.listings || [])].reverse();
          
          // console.log(`✅ Profile updated: ${listings.length} listings`);
          onUpdate(data, listings);
        }
      },
      (error) => {
        console.error("❌ Error fetching profile:", error);
        if (onError) onError(error as Error);
      }
    );

    return unsubscribe;
  },

  /**
   * Subscribe to connections users
   * EXTRACTED FROM: profile.tsx lines 178-187
   * 
   * LINE 179-181: Check if connections exist
   * LINE 182: const ids = profileData.connections.slice(0, 10);
   * LINE 183: const q = query(collection(db, "users"), where("uid", "in", ids));
   * LINE 184-186: onSnapshot with user mapping
   */
  subscribeToConnections: (
    connectionIds: string[],
    onUpdate: (users: any[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe | null => {
    if (!connectionIds || connectionIds.length === 0) {
      onUpdate([]);
      return null;
    }

    // console.log(`👥 Subscribing to ${connectionIds.length} connections`);

    // Firebase 'in' query limit is 10
    const ids = connectionIds.slice(0, 10);

    const q = query(
      collection(db, "users"),
      where("uid", "in", ids)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        // LINE 185: snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
        const users = snap.docs.map((d) => ({
          uid: d.id,
          ...d.data(),
        }));

        // console.log(`✅ Fetched ${users.length} connection profiles`);
        onUpdate(users);
      },
      (error) => {
        console.error("❌ Error fetching connections:", error);
        if (onError) onError(error as Error);
      }
    );

    return unsubscribe;
  },

  /**
   * Delete a product listing
   * EXTRACTED FROM: profile.tsx lines 238-263
   * 
   * LINE 241: const productRef = doc(db, "products", selectedItem.id);
   * LINE 242-246: Get product data for images
   * LINE 249: await deleteDoc(productRef);
   * LINE 250-252: Filter listings
   * LINE 253: Update user document
   */
  deleteProduct: async (
    productId: string,
    userId: string,
    currentListings: any[]
  ): Promise<any[]> => {
    try {
      // console.log(`🗑️ Deleting product: ${productId}`);

      // Get product document
      const productRef = doc(db, "products", productId);
      const productSnap = await getDoc(productRef);

      // Get images array for deletion
      let productImages: string[] = [];
      if (productSnap.exists()) {
        const data = productSnap.data();
        productImages = data.images || [];
      }

      // Delete product document
      await deleteDoc(productRef);
      // console.log("✅ Product document deleted");

      // Update user's listings array
      const updatedList = currentListings.filter(
        (l: any) => l.id !== productId
      );

      await updateDoc(doc(db, "users", userId), {
        listings: updatedList,
      });

      // console.log("✅ User listings updated");

      return productImages; // Return images for Cloudinary deletion

    } catch (error) {
      console.error("❌ Error deleting product:", error);
      throw new Error("Failed to delete product");
    }
  },

  /**
   * Update product details
   * EXTRACTED FROM: profile.tsx lines 265-283
   * 
   * LINE 269-273: Build updated fields
   * LINE 275: Update product document
   * LINE 277-279: Update listings array
   * LINE 280: Update user document
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
      // console.log(`📝 Updating product: ${productId}`);

      // Update product document
      await updateDoc(doc(db, "products", productId), updates);
      // console.log("✅ Product document updated");

      // Update in user's listings array
      const updatedList = currentListings.map((l: any) =>
        l.id === productId ? { ...l, ...updates } : l
      );

      await updateDoc(doc(db, "users", userId), {
        listings: updatedList,
      });

      // console.log("✅ User listings updated");

    } catch (error) {
      console.error("❌ Error updating product:", error);
      throw new Error("Failed to update product");
    }
  },

  /**
   * Sign out user
   * EXTRACTED FROM: profile.tsx line 291
   */
  signOut: async (): Promise<void> => {
    try {
      // console.log("👋 Signing out...");
      await auth.signOut();
      // console.log("✅ Signed out successfully");
    } catch (error) {
      console.error("❌ Error signing out:", error);
      throw new Error("Failed to sign out");
    }
  },
};