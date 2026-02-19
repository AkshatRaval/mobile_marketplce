import { FeedProductCard } from "@/src/components/FeedProductCard";
import { useAuth } from "@/src/context/AuthContext";
import { useProfileData } from "@/src/hooks/useProfileData";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, View } from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ProductFeed() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { productId, initialIndex } = params;

  const { listings } = useProfileData(user?.id);
  const [reelHeight, setReelHeight] = useState(SCREEN_HEIGHT);
  const flatListRef = useRef<FlashListRef<any>>(null);
  const hasScrolled = useRef(false);

  // Parse initial index properly
  const startIndex = initialIndex ? parseInt(initialIndex as string, 10) : 0;

  // Reset scroll flag when params change (new product opened)
  useEffect(() => {
    hasScrolled.current = false;
  }, [productId, initialIndex]);

  // Scroll to initial index ONCE when component mounts or data loads
  useEffect(() => {
    if (
      listings.length > 0 &&
      flatListRef.current &&
      !hasScrolled.current &&
      startIndex >= 0 &&
      startIndex < listings.length
    ) {
      // Small delay to ensure FlashList is ready
      const timer = setTimeout(() => {
        try {
          flatListRef.current?.scrollToIndex({
            index: startIndex,
            animated: false,
          });
          hasScrolled.current = true;
        } catch (error) {
          console.log("Scroll to index failed:", error);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [listings.length, startIndex]);

  if (listings.length === 0) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-black"
      onLayout={(e) => setReelHeight(e.nativeEvent.layout.height)}
    >
      <FlashList
        ref={flatListRef}
        data={listings}
        keyExtractor={(item) => item.id}
        pagingEnabled
        snapToInterval={reelHeight}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        initialScrollIndex={startIndex}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
        }}
        renderItem={({ item }) => (
          <FeedProductCard
            item={item}
            height={reelHeight}
            onClose={() => router.back()}
            onPressOptions={() => {
              // Handle options menu if needed
              // You can add the same menu functionality here
            }}
          />
        )}
      />
    </View>
  );
}
