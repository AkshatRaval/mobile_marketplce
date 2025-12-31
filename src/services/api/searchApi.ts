// src/services/api/searchApi.ts
// Supabase search operations (Hybrid: Recent fetch + Client-side filtering)

import { supabase } from "@/src/supabaseConfig";
import type { Product } from "@/src/types";

export const searchApi = {
  /**
   * Search products by text
   * * Fetches recent products and filters them based on the search term.
   * Note: For production with large datasets, consider using Supabase Text Search.
   */
  searchProducts: async (
    searchText: string,
    maxResults: number = 50
  ): Promise<Product[]> => {
    try {
      console.log(`🔍 Searching for: "${searchText}"`);

      // STEP 1: Fetch products from Supabase with Dealer Info
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
        .limit(maxResults);

      if (error) throw error;

      console.log(`📦 Fetched ${data.length} products from Supabase`);

      // STEP 2: Process search terms
      const searchTerms = searchText
        .toLowerCase()
        .split(" ")
        .filter((t) => t.length > 0);

      // STEP 3: Filter results client-side
      const filteredData: Product[] = [];

      data.forEach((doc: any) => {
        // Handle joined data flattening
        const profile = doc.profiles || {};
        const dealerName = profile.display_name || profile.shop_name || "Unknown";
        
        // Build searchable text from multiple fields
        // Note: extractedData is removed if not in your schema, but kept safe here
        const fullText = `${doc.name} ${doc.description || ""} ${dealerName} ${profile.city || ""}`.toLowerCase();

        // Check if ALL search terms match
        if (searchTerms.every((term) => fullText.includes(term))) {
          filteredData.push({
            id: doc.id,
            userId: doc.owner_id, // Map owner_id -> userId
            dealerId: profile.id,
            dealerName: dealerName,
            dealerAvatar: profile.photo_url,
            dealerPhone: profile.phone,
            city: profile.city || "Unknown",
            name: doc.name,
            price: doc.price,
            description: doc.description,
            images: doc.images || [],
            image: doc.images?.[0], // Fallback for single image view
            createdAt: new Date(doc.created_at).getTime(),
            // extractedData: doc.extractedData, // Uncomment if you add JSONB column for this
          });
        }
      });

      console.log(`✅ Found ${filteredData.length} matching products`);
      return filteredData;

    } catch (error: any) {
      console.error("❌ Error searching products:", error.message);
      throw new Error("Failed to search products");
    }
  },

  /**
   * Get all products (Browse All)
   */
  getAllProducts: async (maxResults: number = 50): Promise<Product[]> => {
    try {
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
        .limit(maxResults);

      if (error) throw error;

      // Map to Product type
      const products: Product[] = data.map((doc: any) => {
        const profile = doc.profiles || {};
        
        return {
          id: doc.id,
          userId: doc.owner_id,
          dealerId: profile.id,
          dealerName: profile.display_name || profile.shop_name || "Unknown",
          dealerAvatar: profile.photo_url,
          dealerPhone: profile.phone,
          city: profile.city || "Unknown",
          name: doc.name,
          price: doc.price,
          description: doc.description,
          images: doc.images || [],
          image: doc.images?.[0],
          createdAt: new Date(doc.created_at).getTime(),
        };
      });

      return products;

    } catch (error: any) {
      console.error("❌ Error fetching all products:", error.message);
      throw new Error("Failed to fetch products");
    }
  },
};