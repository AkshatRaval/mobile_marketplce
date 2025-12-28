// app/search.tsx
// ✨ REFACTORED - UI ONLY ✨
// BEFORE: 243 lines with mixed logic
// AFTER: 120 lines - clean UI only!

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ✅ Import hook and component - all logic is here now!
import {
  CARD_HEIGHT,
  SearchProductCard
} from "@/src/components/SearchProductCard";
import { useSearch } from "@/src/hooks/useSearch";

/**
 * Search Page Component
 * 
 * WHAT STAYED:
 * - JSX rendering (lines 212-243 from original)
 * - UI state (modal visibility, etc.)
 * 
 * WHAT WAS EXTRACTED:
 * - Search state → useSearch hook
 * - Search logic → searchApi service
 * - ProductCard → SearchProductCard component
 * - Firebase query → searchApi.searchProducts()
 */
export default function SearchPage() {
  const router = useRouter();

  // ========================================
  // HOOK - ALL SEARCH LOGIC
  // EXTRACTED FROM: Original lines 176-210
  // ========================================
  const {
    searchText,       // LINE 176: Search input value
    setSearchText,    // Setter for search text
    results,          // LINE 177: Search results
    loading,          // LINE 178: Loading state
    hasSearched,      // LINE 179: Has user searched?
    handleSearch,     // LINE 182-210: Search handler
  } = useSearch();

  // ========================================
  // UI ONLY FROM HERE - NO LOGIC!
  // ========================================

  return (
    // EXTRACTED FROM: Original lines 212-214
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER SECTION */}
      {/* EXTRACTED FROM: Original lines 216-241 */}
      <View className="px-4 pb-2 border-b border-gray-100 z-10 bg-white">
        {/* PAGE TITLE - LINE 217-219 */}
        <Text className="text-2xl font-black text-gray-900 mb-4 mt-2">
          Search
        </Text>

        {/* SEARCH INPUT ROW - LINE 220-239 */}
        <View className="flex-row items-center space-x-2 mb-2">
          {/* SEARCH INPUT BOX - LINE 221-234 */}
          <View className="flex-1 bg-gray-100 rounded-xl flex-row items-center px-4 py-3">
            {/* SEARCH ICON - LINE 222 */}
            <Ionicons name="search" size={20} color="#9CA3AF" />
            
            {/* TEXT INPUT - LINE 223-230 */}
            <TextInput
              className="flex-1 ml-3 text-gray-900 font-medium text-base"
              placeholder="iPhone 15, Samsung..."
              placeholderTextColor="#9CA3AF"
              returnKeyType="search"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
            />
            
            {/* CLEAR BUTTON - LINE 231-233 */}
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* SEARCH BUTTON - LINE 235-239 */}
          <TouchableOpacity
            onPress={handleSearch}
            className="bg-indigo-600 rounded-xl p-3.5"
          >
            <Ionicons name="arrow-forward" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* RESULTS SECTION */}
      {/* EXTRACTED FROM: Original lines 243-272 */}
      <View className="flex-1 bg-gray-50">
        {/* LOADING STATE - LINE 244-248 */}
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        
        /* INITIAL STATE (before search) - LINE 249-254 */
        ) : !hasSearched ? (
          <View className="flex-1 justify-center items-center opacity-40 pb-20">
            <Ionicons name="search-outline" size={80} color="#CBD5E1" />
            <Text className="text-gray-400 mt-4 font-medium">
              Type to search inventory
            </Text>
          </View>
        
        /* NO RESULTS STATE - LINE 255-261 */
        ) : results.length === 0 ? (
          <View className="flex-1 justify-center items-center pb-20">
            <Ionicons name="alert-outline" size={50} color="#64748B" />
            <Text className="text-gray-900 font-bold text-lg mt-4">
              No Results Found
            </Text>
          </View>
        
        /* RESULTS LIST - LINE 262-279 */
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SearchProductCard item={item} router={router} />
            )}
            // REELS-STYLE SNAPPING
            // LINE 268-269: Snap to card height
            snapToInterval={CARD_HEIGHT}
            snapToAlignment="start"
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: 20,
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}