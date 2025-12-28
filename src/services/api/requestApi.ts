// src/services/api/requestApi.ts
// Handles ALL Firebase market request operations
// EXTRACTED FROM: requests.tsx

import { db } from "@/FirebaseConfig";
import type { MarketRequest } from "@/src/types";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    Unsubscribe,
} from "firebase/firestore";

export const requestApi = {
  /**
   * Create a new market request
   * EXTRACTED FROM: requests.tsx handlePostRequest (lines 88-108)
   */
  createRequest: async (requestData: {
    title: string;
    budget: string;
    description: string;
    dealerId: string;
    dealerName: string;
  }): Promise<string> => {
    try {
      console.log("📝 Creating market request...");

      const docRef = await addDoc(collection(db, "market_requests"), {
        title: requestData.title,
        budget: requestData.budget,
        description: requestData.description,
        dealerId: requestData.dealerId,
        dealerName: requestData.dealerName,
        createdAt: Date.now(),
        status: "open",
      });

      console.log("✅ Market request created:", docRef.id);
      return docRef.id;

    } catch (error) {
      console.error("❌ Error creating request:", error);
      throw new Error("Failed to create market request");
    }
  },

  /**
   * Subscribe to real-time market requests
   * EXTRACTED FROM: requests.tsx useEffect (lines 41-56)
   */
  subscribeToRequests: (
    onUpdate: (requests: MarketRequest[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe => {
    try {
      console.log("👂 Subscribing to market requests...");

      const q = query(
        collection(db, "market_requests"),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const requests: MarketRequest[] = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title || "",
              budget: data.budget || "0",
              description: data.description || "",
              dealerName: data.dealerName || "Unknown",
              dealerId: data.dealerId || "",
              createdAt: data.createdAt || Date.now(),
              status: data.status || "open",
            };
          });

          console.log(`✅ Fetched ${requests.length} requests`);
          onUpdate(requests);
        },
        (error) => {
          console.error("❌ Error in request subscription:", error);
          if (onError) {
            onError(error as Error);
          }
        }
      );

      return unsubscribe;

    } catch (error) {
      console.error("❌ Error subscribing to requests:", error);
      throw new Error("Failed to subscribe to requests");
    }
  },

  /**
   * Delete a market request
   * EXTRACTED FROM: requests.tsx handleMenuAction (lines 64-72)
   */
  deleteRequest: async (requestId: string): Promise<void> => {
    try {
      console.log("🗑️ Deleting request:", requestId);

      await deleteDoc(doc(db, "market_requests", requestId));

      console.log("✅ Request deleted");

    } catch (error) {
      console.error("❌ Error deleting request:", error);
      throw new Error("Failed to delete request");
    }
  },
};