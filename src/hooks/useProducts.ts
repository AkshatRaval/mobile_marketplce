// src/hooks/useProducts.ts
// Fetches products for feed display
// EXTRACTED FROM: home.tsx lines 297-311 (fetchProducts + state)

import { productApi } from "@/src/services/api/productApi";
import type { Product } from "@/src/types";
import { useCallback, useEffect, useState } from "react";

interface UseProductsReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProducts(): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all products for feed
   * EXTRACTED FROM: home.tsx fetchProducts function (lines 299-311)
   */
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const fetchedProducts = await productApi.getAllProducts();
      setProducts(fetchedProducts);

    } catch (err) {
      console.error("Error fetching products:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
  };
}