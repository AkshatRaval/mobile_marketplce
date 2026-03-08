// src/hooks/useSearch.ts
// Unified search hook — supports Products tab and Shops tab

import { searchApi } from "@/src/services/api/searchApi";
import type { Product, ShopResult } from "@/src/types";
import { useCallback, useRef, useState } from "react";
import { Keyboard } from "react-native";

type SearchTab = "products" | "shops";

interface UseSearchReturn {
  activeTab: SearchTab;
  setActiveTab: (tab: SearchTab) => void;
  searchText: string;
  setSearchText: (text: string) => void;
  hasSearched: boolean;
  handleSearch: () => Promise<void>;
  clearSearch: () => void;
  results: Product[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  shopResults: ShopResult[];
  shopLoading: boolean;
  shopLoadingMore: boolean;
  shopHasMore: boolean;
  loadMoreShops: () => Promise<void>;
  lastSearchMs: number | null;
}

export function useSearch(): UseSearchReturn {
  const [activeTab, setActiveTab] = useState<SearchTab>("products");
  const [searchText, setSearchText] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearchMs, setLastSearchMs] = useState<number | null>(null);

  // Products
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const productPageRef = useRef(0);

  // Shops
  const [shopResults, setShopResults] = useState<ShopResult[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopLoadingMore, setShopLoadingMore] = useState(false);
  const [shopHasMore, setShopHasMore] = useState(true);
  const shopPageRef = useRef(0);

  // ── handleSearch ──────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchText.trim()) return;
    Keyboard.dismiss();
    setHasSearched(true);

    if (activeTab === "products") {
      setLoading(true);
      setResults([]);
      productPageRef.current = 0;
      setHasMore(true);
      const t = Date.now();
      try {
        const { products, hasMore: more } = await searchApi.searchProducts(searchText, 0);
        setResults(products);
        setHasMore(more);
        setLastSearchMs(Date.now() - t);
      } catch (err) {
        console.error("Product search error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    } else {
      setShopLoading(true);
      setShopResults([]);
      shopPageRef.current = 0;
      setShopHasMore(true);
      const t = Date.now();
      try {
        const { shops, hasMore: more } = await searchApi.searchShops(searchText, 0);
        setShopResults(shops);
        setShopHasMore(more);
        setLastSearchMs(Date.now() - t);
      } catch (err) {
        console.error("Shop search error:", err);
        setShopResults([]);
      } finally {
        setShopLoading(false);
      }
    }
  };

  // ── loadMore products ─────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !searchText.trim()) return;
    setLoadingMore(true);
    const nextPage = productPageRef.current + 1;
    productPageRef.current = nextPage;
    try {
      const { products, hasMore: more } = await searchApi.searchProducts(searchText, nextPage);
      setResults((prev) => [...prev, ...products]);
      setHasMore(more);
    } catch (err) {
      console.error("Load more products error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, searchText]);

  // ── loadMoreShops ─────────────────────────────────────────
  const loadMoreShops = useCallback(async () => {
    if (shopLoadingMore || !shopHasMore || !searchText.trim()) return;
    setShopLoadingMore(true);
    const nextPage = shopPageRef.current + 1;
    shopPageRef.current = nextPage;
    try {
      const { shops, hasMore: more } = await searchApi.searchShops(searchText, nextPage);
      setShopResults((prev) => [...prev, ...shops]);
      setShopHasMore(more);
    } catch (err) {
      console.error("Load more shops error:", err);
    } finally {
      setShopLoadingMore(false);
    }
  }, [shopLoadingMore, shopHasMore, searchText]);

  // ── clearSearch ───────────────────────────────────────────
  const clearSearch = () => {
    setSearchText("");
    setResults([]);
    setShopResults([]);
    setHasSearched(false);
    setHasMore(true);
    setShopHasMore(true);
    setLastSearchMs(null);
    productPageRef.current = 0;
    shopPageRef.current = 0;
  };

  return {
    activeTab,
    setActiveTab,
    searchText,
    setSearchText,
    hasSearched,
    handleSearch,
    clearSearch,
    results,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    shopResults,
    shopLoading,
    shopLoadingMore,
    shopHasMore,
    loadMoreShops,
    lastSearchMs,
  };
}