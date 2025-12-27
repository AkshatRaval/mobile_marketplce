// src/services/api/productApi.ts
// Handles ALL Firebase product operations
// EXTRACTED FROM: upload.tsx lines 103-125 (handlePost Firebase logic)

import { db } from "@/FirebaseConfig";
import type { Product } from "@/src/types";
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

export const productApi = {
  /**
   * Create a new product AND update user's listings
   * EXTRACTED FROM: upload.tsx handlePost function
   * 
   * This does TWO things:
   * 1. Creates product document in "products" collection
   * 2. Updates user's "listings" array in "users" collection
   */
  createProduct: async (productData: {
    userId: string;
    dealerName: string;
    city: string;
    name: string;
    price: string;
    description: string;
    images: string[];
  }): Promise<string> => {
    try {
    // console.log("📝 Creating product in Firebase...");

      // Step 1: Create product document
      const docRef = await addDoc(collection(db, "products"), {
        userId: productData.userId,
        dealerName: productData.dealerName,
        city: productData.city,
        name: productData.name,
        price: productData.price,
        description: productData.description,
        images: productData.images,
        createdAt: Date.now(),
      });

    // console.log("✅ Product created with ID:", docRef.id);

      // Step 2: Update user's listings array
      await updateDoc(doc(db, "users", productData.userId), {
        listings: arrayUnion({
          id: docRef.id,
          name: productData.name,
          price: productData.price,
          image: productData.images[0],
        }),
      });

    //   console.log("✅ User listings updated");

      return docRef.id;

    } catch (error) {
      console.error("❌ Error creating product:", error);
      throw new Error("Failed to create product in Firebase");
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
      let q = query(
        collection(db, "products"),
        orderBy("createdAt", "desc")
      );

      if (filters?.userId) {
        q = query(q, where("userId", "==", filters.userId));
      }

      if (filters?.limit) {
        q = query(q, limit(filters.limit));
      }

      const querySnapshot = await getDocs(q);
      const products: Product[] = [];

      querySnapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() } as Product);
      });

    //   console.log(`✅ Fetched ${products.length} products`);
      return products;

    } catch (error) {
      console.error("❌ Error fetching products:", error);
      throw new Error("Failed to fetch products");
    }
  },

  /**
   * Get single product by ID
   */
  getProductById: async (productId: string): Promise<Product | null> => {
    try {
      const docSnap = await getDoc(doc(db, "products", productId));
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Product;
      }
      
      return null;

    } catch (error) {
      console.error("❌ Error getting product:", error);
      throw new Error("Failed to fetch product");
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
      await updateDoc(doc(db, "products", productId), {
        ...updates,
        updatedAt: Date.now(),
      });

    //   console.log("✅ Product updated:", productId);

    } catch (error) {
      console.error("❌ Error updating product:", error);
      throw new Error("Failed to update product");
    }
  },

  /**
   * Delete product
   */
  deleteProduct: async (productId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, "products", productId));
    //   console.log("✅ Product deleted:", productId);

    } catch (error) {
      console.error("❌ Error deleting product:", error);
      throw new Error("Failed to delete product");
    }
  },

  /**
   * Search products (client-side filtering)
   */
  searchProducts: async (
    searchText: string,
    maxResults: number = 50
  ): Promise<Product[]> => {
    try {
      const q = query(
        collection(db, "products"),
        orderBy("createdAt", "desc"),
        limit(maxResults)
      );
      
      const querySnapshot = await getDocs(q);
      const searchTerms = searchText
        .toLowerCase()
        .split(" ")
        .filter((t) => t.length > 0);
      
      const filteredProducts: Product[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const fullText = `${data.name} ${data.description} ${data.dealerName} ${data.extractedData?.brand} ${data.extractedData?.model}`.toLowerCase();

        if (searchTerms.every((term) => fullText.includes(term))) {
          filteredProducts.push({ id: doc.id, ...data } as Product);
        }
      });

    //   console.log(`✅ Search found ${filteredProducts.length} results`);
      return filteredProducts;

    } catch (error) {
      console.error("❌ Error searching products:", error);
      throw new Error("Failed to search products");
    }
  },
};