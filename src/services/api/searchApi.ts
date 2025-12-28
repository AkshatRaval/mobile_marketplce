// src/services/api/searchApi.ts
// Firebase search operations
// EXTRACTED FROM: search.tsx lines 188-208

import { db } from "@/FirebaseConfig";
import type { Product } from "@/src/types";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";

export const searchApi = {
  /**
   * Search products by text
   * 
   * EXTRACTED FROM: search.tsx handleSearch function
   * LINE 188-194: Firebase query setup
   * LINE 195-198: Search term processing
   * LINE 200-208: Client-side filtering
   * 
   * @param searchText - Text to search for
   * @param maxResults - Maximum number of results (default 50)
   * @returns Array of matching products
   */
  searchProducts: async (
    searchText: string,
    maxResults: number = 50
  ): Promise<Product[]> => {
    try {
      console.log(`🔍 Searching for: "${searchText}"`);

      // STEP 1: Fetch products from Firebase
      // EXTRACTED FROM: search.tsx lines 188-194
      const q = query(
        collection(db, "products"),
        orderBy("createdAt", "desc"),
        limit(maxResults)
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`📦 Fetched ${querySnapshot.size} products from Firebase`);

      // STEP 2: Process search terms
      // EXTRACTED FROM: search.tsx lines 195-198
      const searchTerms = searchText
        .toLowerCase()
        .split(" ")
        .filter((t) => t.length > 0);
      
      console.log(`📝 Search terms:`, searchTerms);

      // STEP 3: Filter results client-side
      // EXTRACTED FROM: search.tsx lines 200-208
      const filteredData: Product[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Build searchable text from multiple fields
        // EXTRACTED FROM: search.tsx lines 202-203
        const fullText = `${data.name} ${data.description} ${data.dealerName} ${data.extractedData?.brand} ${data.extractedData?.model}`.toLowerCase();

        // Check if ALL search terms match
        // EXTRACTED FROM: search.tsx lines 205
        if (searchTerms.every((term) => fullText.includes(term))) {
          // EXTRACTED FROM: search.tsx line 206
          filteredData.push({
            id: doc.id,
            userId: data.userId || "",
            dealerId: data.dealerId,
            createdBy: data.createdBy,
            dealerName: data.dealerName || "Unknown",
            dealerAvatar: data.dealerAvatar,
            dealerPhone: data.dealerPhone,
            city: data.city || "Unknown",
            name: data.name || "",
            price: data.price || "0",
            description: data.description || "",
            images: data.images || [],
            image: data.image,
            createdAt: data.createdAt || Date.now(),
            // updatedAt: data.updatedAt,
            extractedData: data.extractedData,
            // tags: data.tags,
          });
        }
      });

      console.log(`✅ Found ${filteredData.length} matching products`);
      return filteredData;

    } catch (error) {
      console.error("❌ Error searching products:", error);
      throw new Error("Failed to search products");
    }
  },

  /**
   * Get all products (no filter)
   * Useful for "browse all" functionality
   */
  getAllProducts: async (maxResults: number = 50): Promise<Product[]> => {
    try {
      const q = query(
        collection(db, "products"),
        orderBy("createdAt", "desc"),
        limit(maxResults)
      );
      
      const querySnapshot = await getDocs(q);
      
      const products: Product[] = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId || "",
          dealerId: data.dealerId,
          createdBy: data.createdBy,
          dealerName: data.dealerName || "Unknown",
          dealerAvatar: data.dealerAvatar,
          dealerPhone: data.dealerPhone,
          city: data.city || "Unknown",
          name: data.name || "",
          price: data.price || "0",
          description: data.description || "",
          images: data.images || [],
          image: data.image,
          createdAt: data.createdAt || Date.now(),
          updatedAt: data.updatedAt,
          extractedData: data.extractedData,
          tags: data.tags,
        };
      });

      return products;

    } catch (error) {
      console.error("❌ Error fetching all products:", error);
      throw new Error("Failed to fetch products");
    }
  },
};