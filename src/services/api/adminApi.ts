import { supabase } from "@/src/supabaseConfig";

export const adminApi = {
    /**
     * Fetch full details for a dealer including profile and inventory
     */
    getDealerDetails: async (dealerId: string) => {
        try {
            // 1. Fetch Profile
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", dealerId)
                .single();

            if (profileError) throw profileError;

            // 2. Fetch Inventory (Active Products)
            const { data: products, error: productsError } = await supabase
                .from("products")
                .select("*")
                .eq("user_id", dealerId)
                .order("created_at", { ascending: false });

            if (productsError) throw productsError;

            return {
                dealer: profile,
                inventory: products || [],
            };
        } catch (error: any) {
            console.error("❌ Error fetching dealer details:", error.message);
            throw error;
        }
    },

    /**
     * Toggle dealer status (active/suspended)
     */
    toggleDealerStatus: async (dealerId: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === "suspended" ? "active" : "suspended";
            const { error } = await supabase
                .from("profiles")
                .update({ status: newStatus })
                .eq("id", dealerId);

            if (error) throw error;
            return newStatus;
        } catch (error: any) {
            console.error("❌ Error updating dealer status:", error.message);
            throw error;
        }
    }
};
