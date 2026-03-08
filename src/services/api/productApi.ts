// src/services/api/productApi.ts
// Handles ALL Supabase product operations

import { supabase } from "@/src/supabaseConfig";
import type { Product } from "@/src/types";

export const productApi = {
  /**
   * Create a new product and asynchronously parse it via the Edge Function
   */
  createProduct: async (productData: {
    userId: string;
    name: string;
    price: string;
    description: string;
    images: string[];
  }): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from("products")
        .insert({
          user_id: productData.userId,
          name: productData.name,
          price: Number(productData.price),
          description: productData.description,
          images: productData.images,
        })
        .select("id")
        .single();

      if (error) throw error;

      const productId: string = data.id;

      // Fire-and-forget: call Edge Function to parse listing & store metadata
      productApi._parseAndSaveListingData(productId, productData.name).catch(
        (err) => console.warn("⚠️ Edge Function parse failed (non-critical):", err?.message)
      );

      return productId;
    } catch (error: any) {
      console.error("❌ Error creating product:", error.message);
      throw new Error("Failed to create product");
    }
  },

  /**
   * Internal: call the /extract Edge Function and save parsed metadata
   * to the product row for use in efficient server-side searching.
   */
  _parseAndSaveListingData: async (
    productId: string,
    listingText: string
  ): Promise<void> => {
    try {
      // Trim to handle .env spaces: EXPO_PUBLIC_SUPABASE_URL = https://...
      const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").trim();
      const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "").trim();

      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn("⚠️ Missing Supabase env vars — cannot call Edge Function");
        return;
      }

      const edgeFnUrl = `${supabaseUrl}/functions/v1/listing-parser/extract`;
      console.log("🔌 Calling Edge Function:", edgeFnUrl);

      const response = await fetch(edgeFnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseAnonKey}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({ text: listingText }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn("⚠️ Edge Function non-200:", response.status, errText);
        return;
      }

      const parsed = await response.json();
      console.log("✅ Edge Function parsed:", parsed);

      const updates: Record<string, any> = {};
      if (parsed.brand && parsed.brand !== "Unknown") updates.parsed_brand = parsed.brand;
      if (parsed.model) updates.parsed_model = parsed.model;
      if (parsed.ram_gb != null) updates.parsed_ram_gb = parsed.ram_gb;
      if (parsed.storage_gb != null) updates.parsed_storage_gb = parsed.storage_gb;
      if (parsed.battery_percent != null) updates.parsed_battery_percent = parsed.battery_percent;
      if (parsed.condition_percent != null) updates.parsed_condition_percent = parsed.condition_percent;
      if (parsed.price != null) updates.parsed_price = parsed.price;

      if (Object.keys(updates).length === 0) {
        console.log("ℹ️ No parsed fields to update for:", listingText);
        return;
      }

      const { error: updateError } = await supabase
        .from("products")
        .update(updates)
        .eq("id", productId);

      if (updateError) {
        console.warn("⚠️ Failed to save parsed data:", updateError.message);
      } else {
        console.log("✅ Saved parsed metadata for product:", productId);
      }
    } catch (err: any) {
      console.warn("⚠️ _parseAndSaveListingData error:", err?.message);
    }
  },

  /**
   * Get all products with optional filters
   */
  getAllProducts: async (filters?: {
    limit?: number;
    userId?: string;
  }): Promise<Product[]> => {
    try {
      let query = supabase
        .from("products")
        .select(`
          *,
          profiles (
            display_name,
            shop_name,
            city,
            photo_url
          )
        `);

      if (filters?.userId) {
        query = query.eq("user_id", filters.userId);
      }

      query = query.order("created_at", { ascending: false });

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase Select Error:", error.message);
        throw error;
      }

      const products: Product[] = data.map((doc: any) => ({
        id: doc.id,
        userId: doc.user_id,
        name: doc.name,
        price: doc.price,
        description: doc.description,
        images: doc.images || [],
        image: doc.images?.[0] || null,
        createdAt: doc.created_at ? new Date(doc.created_at).getTime() : Date.now(),
        dealerName: doc.profiles?.display_name || doc.profiles?.shop_name || "Dealer",
        city: doc.profiles?.city || "",
        dealerPhoto: doc.profiles?.photo_url || null,
      }));

      return products;
    } catch (error: any) {
      console.error("❌ Error fetching products:", error.message);
      return [];
    }
  },

  /**
   * Get single product by ID
   */
  getProductById: async (productId: string): Promise<Product | null> => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          profiles (
            display_name,
            shop_name,
            city,
            photo_url
          )
        `)
        .eq("id", productId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        price: data.price,
        description: data.description,
        images: data.images || [],
        image: data.images?.[0] || null,
        createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
        dealerName: data.profiles?.display_name || data.profiles?.shop_name || "Dealer",
        city: data.profiles?.city || "",
        dealerPhoto: data.profiles?.photo_url || null,
      } as Product;
    } catch (error: any) {
      console.error("❌ Error getting product:", error.message);
      return null;
    }
  },

  /**
   * Update product
   */
  updateProduct: async (
    productId: string,
    updates: Partial<Product>
  ): Promise<void> => {
    try {
      const cleanUpdates: any = { ...updates };
      delete cleanUpdates.dealerName;
      delete cleanUpdates.city;
      delete cleanUpdates.userId;
      delete cleanUpdates.createdAt;

      const { error } = await supabase
        .from("products")
        .update(cleanUpdates)
        .eq("id", productId);

      if (error) throw error;
    } catch (error: any) {
      console.error("❌ Error updating product:", error.message);
      throw new Error("Failed to update product");
    }
  },

  /**
   * Delete product
   */
  deleteProduct: async (productId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;
    } catch (error: any) {
      console.error("❌ Error deleting product:", error.message);
      throw new Error("Failed to delete product");
    }
  },

  /**
   * Search products (legacy — prefer searchApi.searchProducts for UI)
   */
  searchProducts: async (
    searchText: string,
    maxResults: number = 50
  ): Promise<Product[]> => {
    try {
      const allProducts = await productApi.getAllProducts({ limit: maxResults });
      const searchTerms = searchText.toLowerCase().split(" ").filter((t) => t.length > 0);
      return allProducts.filter((p) => {
        const fullText = `${p.name} ${p.description || ""} ${p.dealerName || ""} ${p.city || ""}`.toLowerCase();
        return searchTerms.every((term) => fullText.includes(term));
      });
    } catch (error: any) {
      console.error("❌ Error searching products:", error.message);
      return [];
    }
  },
};