// src/hooks/useSearch.ts
// Unified search hook — supports Products tab and Shops tab

import { searchApi } from "@/src/services/api/searchApi";
import type { Product, ShopResult } from "@/src/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard } from "react-native";

type SearchTab = "products" | "shops";

interface UseSearchReturn {
  activeTab: SearchTab;
  setActiveTab: (tab: SearchTab) => void;
  searchText: string;
  setSearchText: (text: string) => void;
  hasSearched: boolean;
  handleSearch: () => Promise<void>;
  searchWithText: (text: string) => Promise<void>;
  clearSearch: () => void;
  suggestions: { id: string; text: string; city: string; match_type: string }[];
  isSuggesting: boolean;
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

  // Suggestions
  const [suggestions, setSuggestions] = useState<{ id: string; text: string; city: string; match_type: string }[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-fetch suggestions when typing
  useEffect(() => {
    // Only fetch suggestions if products tab, have text, and haven't pressed "search" yet
    if (!searchText.trim() || hasSearched || activeTab !== "products") {
      setSuggestions([]);
      return;
    }

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    setIsSuggesting(true);
    debounceTimeout.current = setTimeout(async () => {
      try {
        const data = await searchApi.getSmartSuggestions(searchText);
        if (!hasSearched) setSuggestions(data); // avoid race condition if they just hit search
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      } finally {
        setIsSuggesting(false);
      }
    }, 150);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    }
  }, [searchText, hasSearched, activeTab]);

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

  // ── searchWithText — used by suggestion taps to avoid async state race ───
  const searchWithText = async (text: string) => {
    if (!text.trim()) return;
    Keyboard.dismiss();
    setSearchText(text);
    setHasSearched(true);
    setSuggestions([]);

    if (activeTab === "products") {
      setLoading(true);
      setResults([]);
      productPageRef.current = 0;
      setHasMore(true);
      const t = Date.now();
      try {
        const { products, hasMore: more } = await searchApi.searchProducts(text, 0);
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
        const { shops, hasMore: more } = await searchApi.searchShops(text, 0);
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
    setSuggestions([]);
  };

  return {
    activeTab,
    setActiveTab,
    searchText,
    setSearchText,
    hasSearched,
    handleSearch,
    searchWithText,
    clearSearch,
    suggestions,
    isSuggesting,
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