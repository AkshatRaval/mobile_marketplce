import { Ionicons } from "@expo/vector-icons";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
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
  SearchProductCard,
} from "@/src/components/SearchProductCard";
import { useTabRefresh } from "@/src/context/TabelRefreshContext";
import { useSearch } from "@/src/hooks/useSearch";

export default function SearchPage() {
  const router = useRouter();
  const { subscribeToRefresh } = useTabRefresh();

  const {
    searchText,
    setSearchText,
    results,
    loading,
    hasSearched,
    handleSearch,
    clearSearch, // ✅ Now using this!
  } = useSearch();

  // FlashList ref for scrolling to top
  const flatListRef = useRef<FlashListRef<any>>(null);
  // TextInput ref for focusing
  const searchInputRef = useRef<TextInput>(null);

  // Subscribe to double-tap refresh events
  useEffect(() => {
    const unsubscribe = subscribeToRefresh("search", () => {
      // console.log("🔄 Resetting search & scrolling to top...");

      // Scroll to top if there are results
      if (results.length > 0) {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }

      // Clear everything: searchText, results, and hasSearched
      clearSearch();
    });

    return unsubscribe;
  }, [subscribeToRefresh, clearSearch, results.length]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER SECTION */}
      <View className="px-4 pb-2 border-b border-gray-100 z-10 bg-white">
        {/* PAGE TITLE */}
        <Text className="text-2xl font-black text-gray-900 mb-4 mt-2">
          Search
        </Text>

        {/* SEARCH INPUT ROW */}
        <View className="flex-row items-center space-x-2 mb-2">
          {/* SEARCH INPUT BOX */}
          <View className="flex-1 bg-gray-100 rounded-xl flex-row items-center px-4 py-3">
            {/* SEARCH ICON */}
            <Ionicons name="search" size={20} color="#9CA3AF" />

            {/* TEXT INPUT */}
            <TextInput
              ref={searchInputRef}
              className="flex-1 ml-3 text-gray-900 font-medium text-base"
              placeholder="iPhone 15, Samsung..."
              placeholderTextColor="#9CA3AF"
              returnKeyType="search"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
            />

            {/* CLEAR BUTTON */}
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* SEARCH BUTTON */}
          <TouchableOpacity
            onPress={handleSearch}
            className="bg-indigo-600 rounded-xl p-3.5"
          >
            <Ionicons name="arrow-forward" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* RESULTS SECTION */}
      <View className="flex-1 bg-gray-50">
        {/* LOADING STATE */}
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : /* INITIAL STATE (before search) */
          !hasSearched ? (
            <View className="flex-1 justify-center items-center opacity-40 pb-20">
              <Ionicons name="search-outline" size={80} color="#CBD5E1" />
              <Text className="text-gray-400 mt-4 font-medium">
                Type to search inventory
              </Text>
            </View>
          ) : /* NO RESULTS STATE */
            results.length === 0 ? (
              <View className="flex-1 justify-center items-center pb-20">
                <Ionicons name="alert-outline" size={50} color="#64748B" />
                <Text className="text-gray-900 font-bold text-lg mt-4">
                  No Results Found
                </Text>
              </View>
            ) : (
              /* RESULTS LIST */
              <FlashList
                ref={flatListRef}
                data={results}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <SearchProductCard item={item} />
                )}
                // REELS-STYLE SNAPPING
                snapToInterval={CARD_HEIGHT}
                snapToAlignment="start"
                decelerationRate="fast"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingTop: 12,
                  paddingBottom: 20,
                }}
              />
            )}
      </View>
    </SafeAreaView>
  );
}