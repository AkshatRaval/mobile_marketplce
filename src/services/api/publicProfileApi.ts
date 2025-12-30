import { db } from "@/FirebaseConfig";
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  updateDoc,
  where
} from "firebase/firestore";

// Helper to generate a consistent ID for two users
export const getFriendshipId = (uid1: string, uid2: string) => {
  return [uid1, uid2].sort().join('_');
};

const COLLECTION = 'friendships';

export const publicProfileApi = {
  
  // 1. Subscribe to Status (Fixed: Listens to the specific Friendship Document)
  subscribeToConnectionStatus: (
    currentUserId: string,
    dealerId: string,
    onStatusChange: (status: "none" | "pending" | "connected" | "received") => void,
    onError?: (error: Error) => void
  ): Unsubscribe => {
    console.log(`👂 Subscribing to connection status with ${dealerId}`);

    const docId = getFriendshipId(currentUserId, dealerId);

    const unsubscribe = onSnapshot(
      doc(db, COLLECTION, docId),
      (docSnapshot) => {
        if (!docSnapshot.exists()) {
          console.log("➡️ No relationship found");
          onStatusChange("none");
          return;
        }

        const data = docSnapshot.data();

        if (data.status === 'accepted') {
          onStatusChange("connected");
        } else if (data.status === 'pending') {
          // If I am the sender, it's pending. If I am the receiver, I should see "Accept" (handled by UI usually, but good to know)
          if (data.senderId === currentUserId) {
             onStatusChange("pending");
          } else {
             onStatusChange("received"); // Added this state so you know if YOU need to accept it
          }
        } else {
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

  // 2. Fetch Profile (Unchanged - this is fine)
  fetchDealerProfile: async (dealerId: string): Promise<any | null> => {
    try {
      const userSnap = await getDoc(doc(db, "users", dealerId));
      return userSnap.exists() ? userSnap.data() : null;
    } catch (error) {
      console.error("❌ Error fetching dealer profile:", error);
      throw new Error("Failed to fetch dealer profile");
    }
  },

  // 3. Fetch Inventory (Unchanged - this is fine)
  fetchDealerInventory: async (dealerId: string): Promise<any[]> => {
    try {
      const q = query(collection(db, "products"), where("userId", "==", dealerId));
      const productsSnap = await getDocs(q);
      return productsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error("❌ Error fetching inventory:", error);
      throw new Error("Failed to fetch inventory");
    }
  },

  // 4. Fetch Connections (Fixed: Queries 'friendships' collection first)
  fetchDealerConnections: async (dealerId: string): Promise<any[]> => {
    try {
      console.log(`👥 Finding friends for: ${dealerId}`);

      // Step A: Find all accepted friendships
      const q = query(
        collection(db, COLLECTION),
        where("users", "array-contains", dealerId),
        where("status", "==", "accepted"),
      );

      const friendshipSnap = await getDocs(q);
      
      if (friendshipSnap.empty) return [];

      // Step B: Extract the OTHER person's ID
      // We also filter(Boolean) to remove any potential 'undefined' values
      const friendIds = friendshipSnap.docs
        .map(doc => {
          const data = doc.data();
          return data.users.find((uid: string) => uid !== dealerId);
        })
        .filter(Boolean); // Remove nulls/undefined

      if (friendIds.length === 0) return [];

      // Step C: Fetch the actual user profiles
      // ✅ FIXED: Uses documentId() and slices to 10
      const usersQ = query(
        collection(db, "users"),
        where(documentId(), "in", friendIds.slice(0, 10))
      );

      const usersSnap = await getDocs(usersQ);
      
      return usersSnap.docs.map((d) => ({ 
        uid: d.id, // Explicitly return the ID
        ...d.data() 
      }));

    } catch (error) {
      console.error("❌ Error fetching connections:", error);
      throw new Error("Failed to fetch connections");
    }
  },

  // 5. Send Request (Fixed: Creates a document in 'friendships')
  sendConnectionRequest: async (
    currentUserId: string,
    dealerId: string
  ): Promise<void> => {
    try {
      console.log(`📤 Sending connection request to ${dealerId}`);
      const docId = getFriendshipId(currentUserId, dealerId);
      
      // Use setDoc with merge: true to be safe
      await setDoc(doc(db, COLLECTION, docId), {
        users: [currentUserId, dealerId], // Important for querying!
        senderId: currentUserId,
        receiverId: dealerId,
        status: 'pending',
        updatedAt: serverTimestamp(),
      }, { merge: true });

      console.log("✅ Connection request sent");
    } catch (error) {
      console.error("❌ Error sending connection request:", error);
      throw new Error("Failed to send connection request");
    }
  },

  // 6. Accept Request (New Function - You need this!)
  acceptConnectionRequest: async (
    currentUserId: string,
    senderId: string
  ): Promise<void> => {
     try {
       const docId = getFriendshipId(currentUserId, senderId);
       await updateDoc(doc(db, COLLECTION, docId), {
         status: 'accepted',
         updatedAt: serverTimestamp()
       });
     } catch (error) {
       console.error("❌ Error accepting request:", error);
       throw error;
     }
  },

  // 7. Cancel / Unfriend (Fixed: Deletes the document in 'friendships')
  cancelConnectionRequest: async (
    currentUserId: string,
    dealerId: string
  ): Promise<void> => {
    try {
      console.log(`🚫 Removing connection with ${dealerId}`);
      const docId = getFriendshipId(currentUserId, dealerId);
      
      await deleteDoc(doc(db, COLLECTION, docId));

      console.log("✅ Connection removed");
    } catch (error) {
      console.error("❌ Error canceling connection request:", error);
      throw new Error("Failed to cancel connection request");
    }
  },
};