import { cacheService } from "@/src/services/cacheService";
import { supabase } from "@/src/supabaseConfig";
import type { Product } from "@/src/types";
import { useCallback, useEffect, useRef, useState } from "react";

const PAGE_SIZE = 20;
const CACHE_KEY = "home_feed";
const CACHE_TTL_MINUTES = 5;

interface UseProductsReturn {
  products: Product[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  search: (query: string) => Promise<void>;
}

// ── Privacy-aware visible profile IDs ─────────────────────────────────────
// Same logic as searchApi — returns all profile IDs the current user can see.
// Runs 3 parallel queries. Cached in module scope for the session so the
// home feed doesn't fire 3 extra DB calls on every scroll-to-more call.
let _visibleIdsCache: string[] | null = null;
let _visibleIdsCachedAt = 0;
const VISIBLE_IDS_TTL_MS = 60_000; // 1 min

async function getVisibleProfileIds(): Promise<string[]> {
  const now = Date.now();
  if (_visibleIdsCache && now - _visibleIdsCachedAt < VISIBLE_IDS_TTL_MS) {
    return _visibleIdsCache;
  }

  const { data: { user } } = await supabase.auth.getUser();
  const me = user?.id ?? null;

  const [profilesRes, myConnectionsRes, selectedForMeRes] = await Promise.all([
    supabase.from("profiles").select("id, privacy_settings"),
    me
      ? supabase
        .from("connections")
        .select("sender_id, receiver_id")
        .eq("status", "accepted")
        .or(`sender_id.eq.${me},receiver_id.eq.${me}`)
      : Promise.resolve({ data: [], error: null }),
    me
      ? supabase
        .from("selected_connections")
        .select("user_id")
        .eq("selected_user_id", me)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const profiles = profilesRes.data || [];
  const myConnectionIds = new Set<string>(
    (myConnectionsRes.data || []).map((r: any) =>
      r.sender_id === me ? r.receiver_id : r.sender_id
    )
  );
  const selectedByDealerIds = new Set<string>(
    (selectedForMeRes.data || []).map((r: any) => r.user_id)
  );

  const ids: string[] = [];
  for (const p of profiles) {
    const privacy = p.privacy_settings || "Everyone";
    if (me && p.id === me) { ids.push(p.id); continue; }
    if (privacy === "Everyone") ids.push(p.id);
    else if (privacy === "Connections only" && myConnectionIds.has(p.id)) ids.push(p.id);
    else if (privacy === "Selected connections" && selectedByDealerIds.has(p.id)) ids.push(p.id);
    // "No one" → skipped
  }

  _visibleIdsCache = ids;
  _visibleIdsCachedAt = now;
  return ids;
}

export function useProducts(): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const searchQueryRef = useRef("");

  // Map DB row to Product type
  const mapProduct = (doc: any): Product => ({
    id: doc.id,
    userId: doc.user_id,
    name: doc.name,
    price: doc.price,
    description: doc.description,
    images: doc.images || [],
    image: doc.images?.[0] || null,
    city: doc.profiles?.city || doc.city || "",
    createdAt: doc.created_at ? new Date(doc.created_at).getTime() : Date.now(),
    dealerName: doc.profiles?.shop_name || doc.profiles?.display_name || "Dealer",
    dealerPhoto: doc.profiles?.photo_url || null,
    dealerPhone: doc.profiles?.phone || undefined,
    extractedData: doc.extracted_data || undefined,
    category: undefined
  });

  // Core fetch with pagination + privacy filter
  const fetchProducts = useCallback(
    async (searchQuery: string = "", page: number = 0, append: boolean = false) => {
      if (page === 0 && !append) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        // ── Privacy gate ─────────────────────────────────────────
        const visibleIds = await getVisibleProfileIds();
        if (visibleIds.length === 0) {
          setProducts([]);
          setHasMore(false);
          return;
        }

        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from("products")
          .select(
            `*,
          profiles:user_id (
            display_name,
            shop_name,
            photo_url,
            city,
            phone
          )`
          )
          .in("user_id", visibleIds)        // ← privacy filter
          .order("created_at", { ascending: false })
          .range(from, to);

        // Apply search filter
        if (searchQuery.trim().length > 0) {
          query = query.textSearch("search_vector", searchQuery, {
            type: "websearch",
            config: "english",
          });
        }

        const { data, error: err } = await query;
        if (err) throw err;

        const formattedProducts: Product[] = (data || []).map(mapProduct);
        setHasMore(formattedProducts.length === PAGE_SIZE);

        if (append) {
          setProducts((prev) => [...prev, ...formattedProducts]);
        } else {
          setProducts(formattedProducts);
          if (page === 0 && searchQuery === "") {
            cacheService.set(CACHE_KEY, formattedProducts, CACHE_TTL_MINUTES);
          }
        }
      } catch (err: any) {
        console.error("Error fetching products:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Load initial data (from cache first, then fetch)
  useEffect(() => {
    const loadInitial = async () => {
      // Try to show cached data instantly
      const cached = await cacheService.get<Product[]>(CACHE_KEY);
      if (cached && cached.length > 0) {
        setProducts(cached);
        setLoading(false);
        // Fetch fresh data in background
        fetchProducts("", 0, false);
      } else {
        fetchProducts("", 0, false);
      }
    };
    loadInitial();
  }, [fetchProducts]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("products_feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          // Re-fetch first page on any change
          pageRef.current = 0;
          searchQueryRef.current = "";
          fetchProducts("", 0, false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProducts]);

  // Load more (next page)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    await fetchProducts(searchQueryRef.current, nextPage, true);
  }, [fetchProducts, loadingMore, hasMore]);

  // Refetch from page 0
  const refetch = useCallback(async () => {
    pageRef.current = 0;
    searchQueryRef.current = "";
    setHasMore(true);
    await fetchProducts("", 0, false);
  }, [fetchProducts]);

  // Search (resets pagination)
  const search = useCallback(
    async (q: string) => {
      pageRef.current = 0;
      searchQueryRef.current = q;
      setHasMore(true);
      await fetchProducts(q, 0, false);
    },
    [fetchProducts]
  );

  return {
    products,
    loading,
    loadingMore,
    error,
    hasMore,
    refetch,
    loadMore,
    search,
  };
}