// src/hooks/useSearch.ts
// Search state and logic
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

/**
 * Hook for managing search functionality
 * EXTRACTED FROM: search.tsx SearchPage component
 */
export function useSearch(): UseSearchReturn {
  // ========================================
  // STATE
  // EXTRACTED FROM: search.tsx lines 176-180
  // ========================================
  
  // LINE 176: Search input text
  const [searchText, setSearchText] = useState("");
  
  // LINE 177: Search results array
  const [results, setResults] = useState<Product[]>([]);
  
  // LINE 178: Loading state during search
  const [loading, setLoading] = useState(false);
  
  // LINE 179: Track if user has performed a search
  const [hasSearched, setHasSearched] = useState(false);

  // ========================================
  // SEARCH HANDLER
  // EXTRACTED FROM: search.tsx lines 182-210
  // ========================================
  
  /**
   * Perform search operation
   * 
   * BREAKDOWN:
   * LINE 184: Validate search text is not empty
   * LINE 185: Dismiss keyboard
   * LINE 186: Set loading state
   * LINE 187: Mark as searched
   * LINE 188: Clear previous results
   * LINE 190-209: Firebase query and filtering
   */
  const handleSearch = async () => {
    // LINE 184: Early return if search text is empty
    if (!searchText.trim()) return;
    
    // LINE 185: Close keyboard when search starts
    Keyboard.dismiss();
    
    // LINE 186: Show loading indicator
    setLoading(true);
    
    // LINE 187: Mark that user has performed at least one search
    setHasSearched(true);
    
    // LINE 188: Clear previous results while loading
    setResults([]);

    try {
      // LINES 190-208: Firebase search operation
      // This is now extracted to searchApi.searchProducts()
      const filteredData = await searchApi.searchProducts(searchText, 50);
      
      // LINE 208: Update results state
      setResults(filteredData);

    } catch (error) {
      // LINE 209: Log error
      console.error("Search error:", error);
      
      // Set empty results on error
      setResults([]);

    } finally {
      // LINE 210: Hide loading indicator
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
    // console.log("🔄 Search cleared");
  };

  return {
    // State
    searchText,
    results,
    loading,
    hasSearched,
    
    // Actions
    setSearchText,
    handleSearch,
    clearSearch,
  };
}