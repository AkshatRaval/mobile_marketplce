// src/services/api/publicProfileApi.ts
// UPDATED - Now fetches connections too

import { db } from "@/FirebaseConfig";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  Unsubscribe,
  where,
  writeBatch,
} from "firebase/firestore";

export const publicProfileApi = {
  subscribeToConnectionStatus: (
    currentUserId: string,
    dealerId: string,
    onStatusChange: (status: "none" | "pending" | "connected") => void,
    onError?: (error: Error) => void
  ): Unsubscribe => {
    console.log(`👂 Subscribing to connection status with ${dealerId}`);

    const unsubscribe = onSnapshot(
      doc(db, "users", currentUserId),
      (docSnapshot) => {
        if (!docSnapshot.exists()) {
          console.log("⚠️ User document not found");
          return;
        }

        const myData = docSnapshot.data();
        const myConnections = myData.connections || [];
        const mySentRequests = myData.requestSent || [];

        if (myConnections.includes(dealerId)) {
          console.log("✅ Connected");
          onStatusChange("connected");
        } else if (mySentRequests.includes(dealerId)) {
          console.log("⏳ Request pending");
          onStatusChange("pending");
        } else {
          console.log("➡️ Not connected");
          onStatusChange("none");
        }
      },
      (error) => {
        console.error("❌ Error subscribing to connection status:", error);
        if (onError) onError(error as Error);
      }
    );

    return unsubscribe;
  },

  fetchDealerProfile: async (dealerId: string): Promise<any | null> => {
    try {
      console.log(`📥 Fetching dealer profile: ${dealerId}`);

      const userSnap = await getDoc(doc(db, "users", dealerId));

      if (userSnap.exists()) {
        const data = userSnap.data();
        console.log("✅ Dealer profile fetched:", data.displayName);
        return data;
      }

      console.log("⚠️ Dealer profile not found");
      return null;

    } catch (error) {
      console.error("❌ Error fetching dealer profile:", error);
      throw new Error("Failed to fetch dealer profile");
    }
  },

  fetchDealerInventory: async (dealerId: string): Promise<any[]> => {
    try {
      console.log(`📦 Fetching inventory for dealer: ${dealerId}`);

      const q = query(
        collection(db, "products"),
        where("userId", "==", dealerId)
      );

      const productsSnap = await getDocs(q);

      const inventory = productsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      console.log(`✅ Fetched ${inventory.length} products`);
      return inventory;

    } catch (error) {
      console.error("❌ Error fetching inventory:", error);
      throw new Error("Failed to fetch inventory");
    }
  },

  /**
   * Fetch dealer's connections (user profiles)
   * NEW FUNCTION - Shows who the dealer is connected with
   */
  fetchDealerConnections: async (connectionIds: string[]): Promise<any[]> => {
    try {
      if (!connectionIds || connectionIds.length === 0) {
        console.log("⚠️ No connections to fetch");
        return [];
      }

      console.log(`👥 Fetching ${connectionIds.length} connections...`);

      // Firebase 'in' query limit is 10
      const ids = connectionIds.slice(0, 10);

      const q = query(
        collection(db, "users"),
        where("uid", "in", ids)
      );

      const usersSnap = await getDocs(q);

      const connections = usersSnap.docs.map((d) => ({
        uid: d.id,
        ...d.data(),
      }));

      console.log(`✅ Fetched ${connections.length} connection profiles`);
      return connections;

    } catch (error) {
      console.error("❌ Error fetching connections:", error);
      throw new Error("Failed to fetch connections");
    }
  },

  sendConnectionRequest: async (
    currentUserId: string,
    dealerId: string
  ): Promise<void> => {
    try {
      console.log(`📤 Sending connection request to ${dealerId}`);

      const batch = writeBatch(db);
      const myRef = doc(db, "users", currentUserId);
      const dealerRef = doc(db, "users", dealerId);

      batch.update(myRef, {
        requestSent: arrayUnion(dealerId),
      });

      batch.update(dealerRef, {
        requestReceived: arrayUnion(currentUserId),
      });

      await batch.commit();
      console.log("✅ Connection request sent");

    } catch (error) {
      console.error("❌ Error sending connection request:", error);
      throw new Error("Failed to send connection request");
    }
  },

  cancelConnectionRequest: async (
    currentUserId: string,
    dealerId: string
  ): Promise<void> => {
    try {
      console.log(`🚫 Canceling connection request to ${dealerId}`);

      const batch = writeBatch(db);
      const myRef = doc(db, "users", currentUserId);
      const dealerRef = doc(db, "users", dealerId);

      batch.update(myRef, {
        requestSent: arrayRemove(dealerId),
      });

      batch.update(dealerRef, {
        requestReceived: arrayRemove(currentUserId),
      });

      await batch.commit();
      console.log("✅ Connection request canceled");

    } catch (error) {
      console.error("❌ Error canceling connection request:", error);
      throw new Error("Failed to cancel connection request");
    }
  },
};