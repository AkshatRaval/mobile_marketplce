import { FeedProductCard } from "@/src/components/FeedProductCard";
import { useAuth } from "@/src/context/AuthContext";
import { useProfileData } from "@/src/hooks/useProfileData";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  FlatList,
  View,
} from "react-native";

// Module-level constant — never changes, so no setState/re-render needed.
const ITEM_H = Dimensions.get("window").height;

export default function ProductFeed() {
  const { user } = useAuth();
  const router = useRouter();
  const { productId, initialIndex, from } = useLocalSearchParams();

  const { listings } = useProfileData(user?.id);
  const [displayListings, setDisplayListings] = useState<any[]>([]);
  const initialized = useRef(false);

  // Load once — subsequent refetches must not reset scroll position.
  useEffect(() => {
    if (!initialized.current && listings.length > 0) {
      setDisplayListings(listings);
      initialized.current = true;
    }
  }, [listings]);

  const startIndex = useMemo(() => {
    if (displayListings.length === 0) return 0;
    if (productId) {
      const idx = displayListings.findIndex((l) => l.id === productId);
      if (idx >= 0) return idx;
    }
    return initialIndex ? Math.max(0, parseInt(initialIndex as string, 10)) : 0;
  }, [productId, displayListings, initialIndex]);

  const handleDeleted = useCallback((deletedId: string) => {
    setDisplayListings((prev) => prev.filter((l) => l.id !== deletedId));
  }, []);

  const handleUpdated = useCallback((updatedId: string, updates: any) => {
    setDisplayListings((prev) =>
      prev.map((l) =>
        l.id === updatedId
          ? { ...l, ...updates, price: Number(updates.price) || l.price }
          : l
      )
    );
  }, []);

  const handleClose = useCallback(() => {
    if (from === "profile") {
      router.navigate("/(dealer)/profile" as any);
    } else {
      router.navigate("/(dealer)/home" as any);
    }
  }, [from, router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, [handleClose]);

  // getItemLayout tells FlatList every item's exact size & offset upfront.
  // This is what makes initialScrollIndex work instantly with NO flash/bleed.
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_H,
      offset: ITEM_H * index,
      index,
    }),
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <FeedProductCard
        item={item}
        height={ITEM_H}
        onClose={handleClose}
        onDeleted={handleDeleted}
        onUpdated={handleUpdated}
      />
    ),
    [handleClose, handleDeleted, handleUpdated]
  );

  if (displayListings.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0A0A0A",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      <FlatList
        data={displayListings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        // getItemLayout is the KEY — pre-calculated offsets mean
        // initialScrollIndex jumps to the right item instantly,
        // with zero paint of item 0 or any adjacent item.
        getItemLayout={getItemLayout}
        initialScrollIndex={startIndex}
        // Render a small window around the current item only.
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={1}
        removeClippedSubviews
      />
    </View>
  );
}
