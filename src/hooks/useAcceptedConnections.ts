import { supabase } from "@/src/supabaseConfig";
import { useEffect, useState } from "react";

interface AcceptedConnection {
  uid: string;
  displayName: string;
  photoURL: string | null;
  shopName: string | null;
  phoneNumber?: string;
  email?: string;
}

interface UseAcceptedConnectionsReturn {
  connections: AcceptedConnection[];
  connectionIds: string[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useAcceptedConnections(
  currentUserId: string | undefined
): UseAcceptedConnectionsReturn {
  const [connections, setConnections] = useState<AcceptedConnection[]>([]);
  const [connectionIds, setConnectionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch accepted connections where I am either sender or receiver
      const { data: connectionsData, error: connError } = await supabase
        .from("connections")
        .select("sender_id, receiver_id")
        .eq("status", "accepted")
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

      if (connError) throw connError;

      if (!connectionsData || connectionsData.length === 0) {
        setConnections([]);
        setConnectionIds([]);
        setLoading(false);
        return;
      }

      // Extract friend IDs (the other person in the connection)
      const friendIds = connectionsData.map((conn) =>
        conn.sender_id === currentUserId ? conn.receiver_id : conn.sender_id
      );

      setConnectionIds(friendIds);

      // Fetch profiles for these connections
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", friendIds);

      if (profileError) throw profileError;

      const mappedProfiles: AcceptedConnection[] = profiles.map((p) => ({
        uid: p.id,
        displayName: p.display_name,
        photoURL: p.photo_url,
        shopName: p.shop_name,
        phoneNumber: p.phone_number,
        email: p.email,
      }));

      setConnections(mappedProfiles);
    } catch (error) {
      console.error("Error fetching accepted connections:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    fetchConnections();

    // Real-time subscription for connection changes
    const channel = supabase
      .channel("accepted_connections")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connections",
          filter: `status=eq.accepted`,
        },
        (payload) => {
          console.log("🔔 Connection status changed, refreshing...", payload);
          fetchConnections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return {
    connections,
    connectionIds,
    loading,
    refetch: fetchConnections,
  };
}