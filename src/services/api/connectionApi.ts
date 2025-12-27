// src/services/api/connectionApi.ts
// Handles ALL connection request operations (accept/reject)
// EXTRACTED FROM: home.tsx lines 383-418

import { db } from "@/FirebaseConfig";
import {
    arrayRemove,
    arrayUnion,
    doc,
    updateDoc,
    writeBatch,
} from "firebase/firestore";

export const connectionApi = {
  /**
   * Accept connection request
   * EXTRACTED FROM: home.tsx handleAccept function (lines 383-404)
   * 
   * Does TWO things:
   * 1. Adds to both users' connections arrays
   * 2. Removes from requestReceived array
   */
  acceptRequest: async (
    currentUserId: string,
    targetUserId: string
  ): Promise<void> => {
    try {
      console.log(`🤝 Accepting connection: ${currentUserId} -> ${targetUserId}`);

      const batch = writeBatch(db);

      // Update current user (me)
      const myRef = doc(db, "users", currentUserId);
      batch.update(myRef, {
        connections: arrayUnion(targetUserId),
        requestReceived: arrayRemove(targetUserId),
      });

      // Update target user (them)
      const theirRef = doc(db, "users", targetUserId);
      batch.update(theirRef, {
        connections: arrayUnion(currentUserId),
      });

      // Commit both updates atomically
      await batch.commit();

      console.log("✅ Connection request accepted");

    } catch (error) {
      console.error("❌ Error accepting request:", error);
      throw new Error("Failed to accept connection request");
    }
  },

  /**
   * Reject connection request
   * EXTRACTED FROM: home.tsx handleReject function (lines 406-418)
   * 
   * Removes user from requestReceived array
   */
  rejectRequest: async (
    currentUserId: string,
    targetUserId: string
  ): Promise<void> => {
    try {
      console.log(`❌ Rejecting connection: ${currentUserId} -> ${targetUserId}`);

      await updateDoc(doc(db, "users", currentUserId), {
        requestReceived: arrayRemove(targetUserId),
      });

      console.log("✅ Connection request rejected");

    } catch (error) {
      console.error("❌ Error rejecting request:", error);
      throw new Error("Failed to reject connection request");
    }
  },

  /**
   * Send connection request to another user
   */
  sendRequest: async (
    currentUserId: string,
    targetUserId: string
  ): Promise<void> => {
    try {
      console.log(`📤 Sending request: ${currentUserId} -> ${targetUserId}`);

      await updateDoc(doc(db, "users", targetUserId), {
        requestReceived: arrayUnion(currentUserId),
      });

      console.log("✅ Connection request sent");

    } catch (error) {
      console.error("❌ Error sending request:", error);
      throw new Error("Failed to send connection request");
    }
  },

  /**
   * Remove connection (unfriend)
   */
  removeConnection: async (
    currentUserId: string,
    targetUserId: string
  ): Promise<void> => {
    try {
      console.log(`🔗 Removing connection: ${currentUserId} <-> ${targetUserId}`);

      const batch = writeBatch(db);

      const myRef = doc(db, "users", currentUserId);
      batch.update(myRef, {
        connections: arrayRemove(targetUserId),
      });

      const theirRef = doc(db, "users", targetUserId);
      batch.update(theirRef, {
        connections: arrayRemove(currentUserId),
      });

      await batch.commit();

      console.log("✅ Connection removed");

    } catch (error) {
      console.error("❌ Error removing connection:", error);
      throw new Error("Failed to remove connection");
    }
  },
};