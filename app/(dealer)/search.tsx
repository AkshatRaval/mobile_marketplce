import { Ionicons } from "@expo/vector-icons";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import { LinearGradient } from "expo-linear-gradient";

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProductDetailSheet } from "@/src/components/ProductDetailSheet";
import { SearchProductCard } from "@/src/components/SearchProductCard";
import { ShopCard } from "@/src/components/ShopCard";
import { SkeletonList } from "@/src/components/Skeleton";
import { useTabRefresh } from "@/src/context/TabelRefreshContext";
import { useSearch } from "@/src/hooks/useSearch";
import type { Product } from "@/src/types";

export default function SearchPage() {
  const { subscribeToRefresh } = useTabRefresh();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const {
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
    loadMore,
    shopResults,
    shopLoading,
    shopLoadingMore,
    loadMoreShops,
  } = useSearch();

  const flatListRef = useRef<FlashListRef<any>>(null);
  const shopListRef = useRef<FlashListRef<any>>(null);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const unsubscribe = subscribeToRefresh("search", () => {
      if (results.length > 0) {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
      clearSearch();
    });
    return unsubscribe;
  }, [subscribeToRefresh, clearSearch, results.length]);

  const handleTabSwitch = (tab: "products" | "shops") => {
    Animated.spring(slideAnim, {
      toValue: tab === "products" ? 0 : 1,
      useNativeDriver: true,
      tension: 120,
      friction: 10,
    }).start();
    setActiveTab(tab);
  };

  const isLoading = activeTab === "products" ? loading : shopLoading;
  const isEmpty =
    hasSearched &&
    !isLoading &&
    (activeTab === "products" ? results.length === 0 : shopResults.length === 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAFAFA" }} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* ── HEADER ─────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: "#fff",
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 0,
          borderBottomWidth: 1,
          borderBottomColor: "#F1F1F5",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        {/* Title */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 26, fontWeight: "900", color: "#0F0F1A", letterSpacing: -0.5 }}>
              Search
            </Text>
          </View>
        </View>

        {/* Search Input */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#F4F4F8",
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 2,
            marginBottom: 14,
            borderWidth: 1.5,
            borderColor: "#EBEBF0",
          }}
        >
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            ref={searchInputRef}
            style={{
              flex: 1,
              marginLeft: 10,
              fontSize: 15,
              fontWeight: "500",
              color: "#111827",
              paddingVertical: 11,
            }}
            placeholder={
              activeTab === "products"
                ? "iPhone, Samsung A55, Redmi..."
                : "Shop name, city..."
            }
            placeholderTextColor="#B0B0BD"
            returnKeyType="search"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
          />
          {searchText.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchText("")} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color="#C0C0CC" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={handleSearch}
            style={{
              backgroundColor: "#4F46E5",
              borderRadius: 12,
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 8,
            }}
          >
            <Ionicons name="arrow-forward" size={18} color="white" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: "row", gap: 8, paddingBottom: 1 }}>
          {(["products", "shops"] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => handleTabSwitch(tab)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 9,
                  borderRadius: 12,
                  backgroundColor: isActive ? "#4F46E5" : "#F4F4F8",
                  borderWidth: 1.5,
                  borderColor: isActive ? "#4338CA" : "#EBEBF0",
                }}
              >
                <Ionicons
                  name={tab === "products" ? "phone-portrait-outline" : "storefront-outline"}
                  size={14}
                  color={isActive ? "#fff" : "#6B7280"}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: isActive ? "#fff" : "#6B7280",
                    letterSpacing: 0.1,
                  }}
                >
                  {tab === "products" ? "Products" : "Shops"}
                </Text>
                {isActive && (
                  <View
                    style={{
                      backgroundColor: "rgba(255,255,255,0.25)",
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                    }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── RESULTS ─────────────────────────────────────────── */}
      <View style={{ flex: 1, backgroundColor: "#F7F7FB" }}>

        {/* Loading skeleton / spinner */}
        {isLoading ? (
          activeTab === "products" ? (
            <SkeletonList count={5} type="search" />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={{ marginTop: 12, color: "#9CA3AF", fontSize: 13, fontWeight: "500" }}>
                Finding shops...
              </Text>
            </View>
          )
        ) : !hasSearched ? (
          /* ── IDLE STATE ── */
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 }}>
            <LinearGradient
              colors={["#EEF2FF", "#F5F3FF"]}
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <Ionicons
                name={activeTab === "products" ? "phone-portrait-outline" : "storefront-outline"}
                size={46}
                color="#A5B4FC"
              />
            </LinearGradient>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#1F2937", marginBottom: 6, letterSpacing: -0.3 }}>
              {activeTab === "products" ? "Find any phone" : "Discover shops"}
            </Text>
            <Text style={{ fontSize: 13, color: "#9CA3AF", fontWeight: "500", textAlign: "center", lineHeight: 20, maxWidth: 220 }}>
              {activeTab === "products"
                ? "Search by brand, model, specs or keywords"
                : "Search by shop name, dealer name or city"}
            </Text>
          </View>
        ) : isEmpty ? (
          /* ── NO RESULTS ── */
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "#FEF2F2",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="search-outline" size={36} color="#FCA5A5" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#1F2937", marginBottom: 6 }}>
              Nothing found
            </Text>
            <Text style={{ fontSize: 13, color: "#9CA3AF", fontWeight: "500", textAlign: "center", maxWidth: 220 }}>
              Try a different spelling or shorter search
            </Text>
            <TouchableOpacity
              onPress={() => { setSearchText(""); searchInputRef.current?.focus(); }}
              style={{
                marginTop: 20,
                paddingHorizontal: 20,
                paddingVertical: 10,
                backgroundColor: "#EEF2FF",
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "#4F46E5", fontWeight: "700", fontSize: 14 }}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : activeTab === "products" ? (
          /* ── PRODUCT RESULTS ── */
          <FlashList
            ref={flatListRef}
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SearchProductCard item={item} />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={
              <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
                <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "600" }}>
                  {results.length} result{results.length !== 1 ? "s" : ""}
                </Text>
              </View>
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={{ paddingVertical: 16, alignItems: "center" }}>
                  <ActivityIndicator size="small" color="#4F46E5" />
                </View>
              ) : null
            }
          />
        ) : (
          /* ── SHOP RESULTS ── */
          <FlashList
            ref={shopListRef}
            data={shopResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ShopCard shop={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
            onEndReached={loadMoreShops}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={
              <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
                <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "600" }}>
                  {shopResults.length} shop{shopResults.length !== 1 ? "s" : ""} found
                </Text>
              </View>
            }
            ListFooterComponent={
              shopLoadingMore ? (
                <View style={{ paddingVertical: 16, alignItems: "center" }}>
                  <ActivityIndicator size="small" color="#4F46E5" />
                </View>
              ) : null
            }
          />
        )}
      </View>

      {/* ── PRODUCT DETAIL SHEET ─── */}
      <ProductDetailSheet
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </SafeAreaView>
  );
}