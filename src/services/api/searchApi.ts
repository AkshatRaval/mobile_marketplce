// src/services/api/searchApi.ts
// Server-side search with ilike + OR filters for efficient matching

import { supabase } from "@/src/supabaseConfig";
import type { Product, ShopResult } from "@/src/types";

const PAGE_SIZE = 20;

/**
 * Build the set of profile IDs whose products the current user is allowed to see.
 *
 * Privacy rules:
 *  - "Everyone" (or null)    → anyone can see their products
 *  - "Connections only"      → only accepted connections of that dealer can see
 *  - "Selected connections"  → only the specific list the dealer chose can see
 *  - "No one"                → nobody except the dealer themselves
 *
 * The current user always sees their own products regardless.
 */
async function getVisibleProfileIds(): Promise<string[]> {
  // Step 0 — who is browsing?
  const { data: { user } } = await supabase.auth.getUser();
  const me = user?.id ?? null;

  // Run all queries in parallel
  const [profilesRes, myConnectionsRes, selectedForMeRes] = await Promise.all([
    // All profiles with their privacy setting
    supabase.from("profiles").select("id, privacy_settings"),

    // Dealers who have me as an accepted connection (both directions)
    me
      ? supabase
        .from("connections")
        .select("sender_id, receiver_id")
        .eq("status", "accepted")
        .or(`sender_id.eq.${me},receiver_id.eq.${me}`)
      : Promise.resolve({ data: [], error: null }),

    // Dealers who have specifically selected me in selected_connections
    me
      ? supabase
        .from("selected_connections")
        .select("user_id")
        .eq("selected_user_id", me)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const profiles = profilesRes.data || [];

  // IDs of dealers I'm an accepted connection of
  const myConnectionIds = new Set<string>(
    (myConnectionsRes.data || []).map((row: any) =>
      row.sender_id === me ? row.receiver_id : row.sender_id
    )
  );

  // IDs of dealers who have selected me specifically
  const selectedByDealerIds = new Set<string>(
    (selectedForMeRes.data || []).map((row: any) => row.user_id)
  );

  const visibleIds: string[] = [];

  for (const profile of profiles) {
    const privacy = profile.privacy_settings || "Everyone";
    const dealerId: string = profile.id;

    // Always include own profile
    if (me && dealerId === me) {
      visibleIds.push(dealerId);
      continue;
    }

    if (privacy === "Everyone") {
      visibleIds.push(dealerId);
    } else if (privacy === "Connections only") {
      // Show if I'm a connection of this dealer
      if (myConnectionIds.has(dealerId)) visibleIds.push(dealerId);
    } else if (privacy === "Selected connections") {
      // Show only if this dealer selected me specifically
      if (selectedByDealerIds.has(dealerId)) visibleIds.push(dealerId);
    }
    // "No one" → skipped
  }

  return visibleIds;
}

export const searchApi = {
  /**
   * Search products by query — server-side, case-insensitive ilike across
   * name, parsed_brand, and parsed_model columns.
   */
  searchProducts: async (
    searchText: string,
    page: number = 0
  ): Promise<{ products: Product[]; hasMore: boolean }> => {
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const raw = searchText.trim();
      if (!raw) return { products: [], hasMore: false };

      // ── Privacy filter — connection-aware ──
      const publicUserIds = await getVisibleProfileIds();
      if (publicUserIds.length === 0) return { products: [], hasMore: false };

      // ── Query normalizer ──────────────────────────────────
      // Insert space between digit→letter and letter→digit boundaries
      // so "13pro" becomes "13 pro", "a55" becomes "a 55", etc.
      const normalized = raw
        .replace(/(\d)([a-zA-Z])/g, "$1 $2")
        .replace(/([a-zA-Z])(\d)/g, "$1 $2")
        .trim();

      // Collect all unique query variants to search
      const queryVariants = Array.from(
        new Set([
          raw,                               // original: "13pro"
          normalized,                        // normalized: "13 pro"
          ...normalized.split(/\s+/).filter((t) => t.length >= 2), // tokens: ["13","pro"]
        ])
      );

      const columns = ["name", "parsed_brand", "parsed_model", "description"];

      // Build OR filters: each (column, variant) pair becomes one ilike clause
      const orParts: string[] = [];
      for (const variant of queryVariants) {
        for (const col of columns) {
          orParts.push(`${col}.ilike.%${variant}%`);
        }
      }
      const orFilter = orParts.join(",");

      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          profiles (
            id,
            display_name,
            shop_name,
            city,
            photo_url,
            phone
          )
        `)
        .or(orFilter)
        .in("user_id", publicUserIds)        // ← privacy gate
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const products: Product[] = (data || []).map((doc: any) => {
        const profile = doc.profiles || {};
        return {
          id: doc.id,
          userId: doc.user_id,
          dealerId: profile.id,
          dealerName: profile.display_name || profile.shop_name || "Dealer",
          dealerAvatar: profile.photo_url,
          dealerPhone: profile.phone || undefined,
          city: profile.city || "",
          name: doc.name,
          price: doc.price,
          description: doc.description,
          images: doc.images || [],
          image: doc.images?.[0],
          createdAt: new Date(doc.created_at).getTime(),
          extractedData: doc.parsed_brand
            ? {
              brand: doc.parsed_brand,
              model: doc.parsed_model,
              ramGb: doc.parsed_ram_gb,
              storageGb: doc.parsed_storage_gb,
            }
            : undefined,
        };
      });

      return {
        products,
        hasMore: (data || []).length === PAGE_SIZE,
      };
    } catch (error: any) {
      console.error("❌ Error searching products:", error.message);
      throw new Error("Failed to search products");
    }
  },

  /**
   * Search shops/profiles by shop name, display name, or city — server-side.
   */
  searchShops: async (
    searchText: string,
    page: number = 0
  ): Promise<{ shops: ShopResult[]; hasMore: boolean }> => {
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const q = searchText.trim();
      if (!q) return { shops: [], hasMore: false };

      const orFilter = [
        `shop_name.ilike.%${q}%`,
        `display_name.ilike.%${q}%`,
        `city.ilike.%${q}%`,
      ].join(",");

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, shop_name, photo_url, city")
        .or(orFilter)
        // No privacy gate here — shop profiles are always discoverable
        .order("shop_name", { ascending: true })
        .range(from, to);

      if (error) throw error;

      const shops: ShopResult[] = (data || []).map((row: any) => ({
        id: row.id,
        shopName: row.shop_name || "",
        displayName: row.display_name || "",
        photoUrl: row.photo_url || null,
        city: row.city || "",
      }));

      return {
        shops,
        hasMore: (data || []).length === PAGE_SIZE,
      };
    } catch (error: any) {
      console.error("❌ Error searching shops:", error.message);
      throw new Error("Failed to search shops");
    }
  },

  /**
   * Get all products (Browse All) with pagination
   */
  getAllProducts: async (
    page: number = 0
  ): Promise<{ products: Product[]; hasMore: boolean }> => {
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          profiles (
            id,
            display_name,
            shop_name,
            city,
            photo_url,
            phone
          )
        `)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const products: Product[] = (data || []).map((doc: any) => {
        const profile = doc.profiles || {};
        return {
          id: doc.id,
          userId: doc.user_id,
          dealerId: profile.id,
          dealerName:
            profile.display_name || profile.shop_name || "Dealer",
          dealerAvatar: profile.photo_url,
          dealerPhone: profile.phone || undefined,
          city: profile.city || "",
          name: doc.name,
          price: doc.price,
          description: doc.description,
          images: doc.images || [],
          image: doc.images?.[0],
          createdAt: new Date(doc.created_at).getTime(),
        };
      });

      return {
        products,
        hasMore: (data || []).length === PAGE_SIZE,
      };
    } catch (error: any) {
      console.error("❌ Error fetching all products:", error.message);
      throw new Error("Failed to fetch products");
    }
  },
};