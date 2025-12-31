// src/hooks/useSearch.ts
// Search state and logic (Compatible with Supabase via searchApi)
// EXTRACTED FROM: search.tsx lines 176-210

import { searchApi } from "@/src/services/api/searchApi";
import type { Product } from "@/src/types";
import { useState } from "react";
import { Keyboard } from "react-native";

interface UseSearchReturn {
  // State
  searchText: string;
  results: Product[];
  loading: boolean;
  hasSearched: boolean;
  
  // Actions
  setSearchText: (text: string) => void;
  handleSearch: () => Promise<void>;
  clearSearch: () => void;
}

export function useSearch(): UseSearchReturn {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  /**
   * Perform search operation
   */
  const handleSearch = async () => {
    if (!searchText.trim()) return;
    
    Keyboard.dismiss();
    setLoading(true);
    setHasSearched(true);
    setResults([]);

    try {
      // Calls searchApi which will be updated to use Supabase
      const filteredData = await searchApi.searchProducts(searchText, 50);
      setResults(filteredData);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear search (reset to initial state)
   */
  const clearSearch = () => {
    setSearchText("");
    setResults([]);
    setHasSearched(false);
  };

  return {
    searchText,
    results,
    loading,
    hasSearched,
    setSearchText,
    handleSearch,
    clearSearch,
  };
}