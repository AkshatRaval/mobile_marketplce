// src/services/api/connectionApi.ts
import { supabase } from "@/src/supabaseConfig";

export const connectionApi = {

  /**
   * Send connection request to another user
   * (Creates a new row in 'connections' table)
   */
  sendRequest: async (
    currentUserId: string,
    targetUserId: string
  ): Promise<void> => {
    try {
      console.log(`📤 Sending request: ${currentUserId} -> ${targetUserId}`);

      // Check if connection already exists to prevent duplicates
      const { data: existing } = await supabase
        .from("connections")
        .select("id")
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`)
        .single();

      if (existing) {
        console.log("⚠️ Connection already exists or pending");
        return;
      }

      const { error } = await supabase.from("connections").insert({
        sender_id: currentUserId,
        receiver_id: targetUserId,
        status: "pending",
        users: [currentUserId, targetUserId], // Helper array for easier searching
      });

      if (error) throw error;

      console.log("✅ Connection request sent");

    } catch (error) {
      console.error("❌ Error sending request:", error);
      throw new Error("Failed to send connection request");
    }
  },

  /**
   * Accept connection request
   * (Updates status from 'pending' to 'accepted')
   */
  acceptRequest: async (
    currentUserId: string,
    targetUserId: string
  ): Promise<void> => {
    try {
      console.log(`🤝 Accepting connection: ${currentUserId} (Me) <- ${targetUserId} (Sender)`);

      // I am the receiver, they are the sender
      const { error } = await supabase
        .from("connections")
        .update({ status: "accepted" })
        .eq("sender_id", targetUserId)
        .eq("receiver_id", currentUserId);

      if (error) throw error;

      console.log("✅ Connection request accepted");

    } catch (error) {
      console.error("❌ Error accepting request:", error);
      throw new Error("Failed to accept connection request");
    }
  },

  /**
   * Reject connection request
   * (Deletes the pending row)
   */
  rejectRequest: async (
    currentUserId: string,
    targetUserId: string
  ): Promise<void> => {
    try {
      console.log(`❌ Rejecting connection from: ${targetUserId}`);

      // I am the receiver, they are the sender
      const { error } = await supabase
        .from("connections")
        .delete()
        .eq("sender_id", targetUserId)
        .eq("receiver_id", currentUserId)
        .eq("status", "pending"); // Safety check

      if (error) throw error;

      console.log("✅ Connection request rejected (deleted)");

    } catch (error) {
      console.error("❌ Error rejecting request:", error);
      throw new Error("Failed to reject connection request");
    }
  },

  /**
   * Remove connection (unfriend)
   * (Deletes the row regardless of who sent it)
   */
  removeConnection: async (
    currentUserId: string,
    targetUserId: string
  ): Promise<void> => {
    try {
      console.log(`🔗 Removing connection: ${currentUserId} <-> ${targetUserId}`);

      // Delete where (Sender=Me AND Receiver=Them) OR (Sender=Them AND Receiver=Me)
      const { error } = await supabase
        .from("connections")
        .delete()
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`);

      if (error) throw error;

      console.log("✅ Connection removed");

    } catch (error) {
      console.error("❌ Error removing connection:", error);
      throw new Error("Failed to remove connection");
    }
  },
};