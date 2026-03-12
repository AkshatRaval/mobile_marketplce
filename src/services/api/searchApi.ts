// src/services/api/searchApi.ts
// Server-side search with ilike + OR filters for efficient matching

import { supabase, supabaseAnonKey } from "@/src/supabaseConfig";
import type { Product, ShopResult } from "@/src/types";

const PAGE_SIZE = 20;

export const searchApi = {
  /**
   * Get search suggestions — queries products directly for instant prefix results
   * Works immediately without needing the search_suggestions table populated
   */
  getSmartSuggestions: async (
    query: string,
    _city?: string
  ): Promise<{ id: string; text: string; city: string; match_type: string }[]> => {
    try {
      if (!query.trim() || query.trim().length < 1) return [];
      const q = `${query.trim()}%`; // prefix match only — fast & ordered

      // Step 1: Try the smart-suggest Edge function first (if search_suggestions table has data)
      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke("smart-suggest", {
          body: { query: query.trim(), city: _city },
          headers: { Authorization: `Bearer ${supabaseAnonKey}` },
        });
        if (!edgeError && edgeData?.data?.length > 0) {
          // Filter out trigram false positives — only keep suggestions that actually contain the query
          const filtered = (edgeData.data as { id: string; text: string; city: string; match_type: string }[])
            .filter(s => s.text.toLowerCase().includes(query.toLowerCase().trim()));
          if (filtered.length > 0) return filtered;
        }
      } catch (_) {}

      // Step 2: Fallback — query products directly with prefix ILIKE (always works)
      const { data, error } = await supabase
        .from("products")
        .select("id, name, parsed_brand, parsed_model")
        .or(`name.ilike.${q},parsed_brand.ilike.${q},parsed_model.ilike.${q}`)
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) throw error;

      // Build unique suggestion list from product names/brands
      const seen = new Set<string>();
      const suggestions: { id: string; text: string; city: string; match_type: string }[] = [];

      for (const row of data || []) {
        const candidates = [
          row.parsed_brand,
          row.parsed_model,
          row.name,
        ].filter(Boolean) as string[];

        for (const c of candidates) {
          const lower = c.toLowerCase().trim();
          if (lower.startsWith(query.toLowerCase().trim()) && !seen.has(lower)) {
            seen.add(lower);
            suggestions.push({ id: `suggestion_${lower}`, text: c, city: "", match_type: "prefix" });
          }
        }
        if (suggestions.length >= 7) break;
      }

      return suggestions;
    } catch (_e) {
      return [];
    }
  },



  /**
   * Search products by query — queries Supabase DB directly (fast & reliable)
   */
  searchProducts: async (
    searchText: string,
    page: number = 0
  ): Promise<{ products: Product[]; hasMore: boolean }> => {
    try {
      if (!searchText.trim()) return { products: [], hasMore: false };
      const t = Date.now();
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const q = `%${searchText.trim()}%`;

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
        .or(`name.ilike.${q},parsed_brand.ilike.${q},parsed_model.ilike.${q},description.ilike.${q}`)
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
        };
      });

      return { products, hasMore: (data || []).length === PAGE_SIZE };
    } catch (error: any) {
      throw new Error("Failed to search products");
    }
  },



  /**
   * Search shops by query — queries Supabase DB directly (fast & reliable)
   */
  searchShops: async (
    searchText: string,
    page: number = 0
  ): Promise<{ shops: ShopResult[]; hasMore: boolean }> => {
    try {
      if (!searchText.trim()) return { shops: [], hasMore: false };
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const q = `%${searchText.trim()}%`;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, shop_name, city, photo_url, phone, created_at")
        .or(`display_name.ilike.${q},shop_name.ilike.${q},city.ilike.${q}`)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const shops: ShopResult[] = (data || []).map((p: any) => ({
        id: p.id,
        shopName: p.shop_name || p.display_name || "Shop",
        displayName: p.display_name || p.shop_name || "Shop",
        city: p.city || "",
        photoUrl: p.photo_url,
        phone: p.phone,
      }));

      return { shops, hasMore: (data || []).length === PAGE_SIZE };
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