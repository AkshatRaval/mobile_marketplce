// src/services/api/productApi.ts
// Handles ALL Supabase product operations

import { supabase } from "@/src/supabaseConfig";
import type { Product } from "@/src/types";

export const productApi = {
  /**
   * Create a new product
   */
  createProduct: async (productData: {
    userId: string; // Changed from owner_id to userId to match DB
    name: string;
    price: string;
    description: string;
    images: string[];
  }): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from("products")
        .insert({
          user_id: productData.userId, // ✅ FIXED: Matches DB column 'user_id'
          name: productData.name,
          price: Number(productData.price),
          description: productData.description,
          images: productData.images,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data.id;

    } catch (error: any) {
      console.error("❌ Error creating product:", error.message);
      throw new Error("Failed to create product");
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
      // 1. Start building the query
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

      // 2. Apply Filters
      if (filters?.userId) {
        query = query.eq("user_id", filters.userId); // ✅ FIXED
      }

      // 3. Apply Modifiers
      query = query.order("created_at", { ascending: false });

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      // 4. Execute Query
      const { data, error } = await query;

      if (error) {
        console.error("Supabase Select Error:", error.message);
        throw error;
      }

      // 5. Map snake_case DB fields to camelCase App types
      const products: Product[] = data.map((doc: any) => ({
        id: doc.id,
        userId: doc.user_id, // ✅ FIXED
        name: doc.name,
        price: doc.price,
        description: doc.description,
        images: doc.images || [],
        image: doc.images?.[0] || null,
        createdAt: doc.created_at ? new Date(doc.created_at).getTime() : Date.now(),
        
        dealerName: doc.profiles?.display_name || doc.profiles?.shop_name || "Unknown",
        city: doc.profiles?.city || "Unknown",
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
        userId: data.user_id, // ✅ FIXED
        name: data.name,
        price: data.price,
        description: data.description,
        images: data.images || [],
        image: data.images?.[0] || null,
        createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
        dealerName: data.profiles?.display_name || data.profiles?.shop_name || "Unknown",
        city: data.profiles?.city || "Unknown",
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
   * Search products
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