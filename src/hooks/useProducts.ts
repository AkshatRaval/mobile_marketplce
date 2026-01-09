import { supabase } from "@/src/supabaseConfig";
import type { Product } from "@/src/types";
import { useCallback, useEffect, useState } from "react";

interface UseProductsReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  search: (query: string) => Promise<void>;
}

export function useProducts(): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch & Search Logic
  const fetchProducts = useCallback(async (searchQuery: string = "") => {
    setLoading(true);
    setError(null);

    try {
      // Start the query
      let query = supabase
        .from("products")
        .select(`
          *,
          profiles:user_id (
            display_name,
            shop_name,
            photo_url,
            city,
            phone
          )
        `)
        .order("created_at", { ascending: false });

      // ✅ SMART SEARCH: Use the Vector Column we created
      if (searchQuery.trim().length > 0) {
        // 'websearch' is smart: handles "iphone -case" (iphone but not case)
        query = query.textSearch("search_vector", searchQuery, {
          type: "websearch",
          config: "english",
        });
      }

      const { data, error: err } = await query;

      if (err) throw err;

      // Map DB response to Product Type
      const formattedProducts: Product[] = (data || []).map((doc: any) => ({
        id: doc.id,
        userId: doc.user_id,
        name: doc.name,
        price: doc.price,
        description: doc.description,
        images: doc.images || [],
        image: doc.images?.[0] || null,
        city: doc.profiles?.city || doc.city || "India",
        createdAt: doc.created_at ? new Date(doc.created_at).getTime() : Date.now(),
        // Dealer Details from Profile Join
        dealerName: doc.profiles?.shop_name || doc.profiles?.display_name || "Dealer",
        dealerPhoto: doc.profiles?.photo_url || null,
        dealerPhone: doc.profiles?.phone || null,
        // AI Extracted Data
        extractedData: doc.extracted_data || null,
      }));

      setProducts(formattedProducts);
    } catch (err: any) {
      console.error("Error fetching products:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Initial Fetch
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // 3. Real-time Subscription (Auto-update feed)
  useEffect(() => {
    const channel = supabase
      .channel("products_feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        (payload) => {
          console.log("⚡ Product feed updated:", payload.eventType);
          fetchProducts(); // Re-fetch to get fresh data + joins
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    refetch: () => fetchProducts(""),
    search: (q) => fetchProducts(q), 
  };
}