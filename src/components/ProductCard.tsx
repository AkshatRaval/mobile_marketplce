// src/components/product/ProductCard.tsx
// Product card component for feed display
// EXTRACTED FROM: home.tsx lines 76-270

import type { Product } from "@/src/types";
import { communications } from "@/src/utils/communications";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
    Dimensions,
    FlatList,
    Image,
    Pressable,
    Text,
    TouchableOpacity,
    View,
    ViewToken,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 16;

/**
 * Helper to get creator ID from product
 * EXTRACTED FROM: home.tsx getCreatorId function (lines 64-72)
 */
const getCreatorId = (item: any): string | null => {
  return (
    item?.userId ||
    item?.dealerId ||
    item?.ownerId ||
    item?.postedBy ||
    item?.createdBy ||
    null
  );
};

interface ProductCardProps {
  item: Product;
  height: number;
  onPressProfile: (uid: string) => void;
  onPressImage: (images: string[], index: number) => void;
}

/**
 * Product Card Component
 * EXTRACTED FROM: home.tsx ProductCard component (lines 76-270)
 */
export const ProductCard = React.memo(
  ({ item, height, onPressProfile, onPressImage }: ProductCardProps) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [expanded, setExpanded] = useState(false);

    // Image carousel handlers
    const onViewableItemsChanged = useRef(
      ({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index != null) {
          setActiveIndex(viewableItems[0].index);
        }
      }
    ).current;

    const viewabilityConfig = useRef({
      viewAreaCoveragePercentThreshold: 50,
    }).current;

    // Get images array (handle different field names)
    const images =
      item.images && item.images.length > 0
        ? item.images
        : item.image
          ? [item.image]
          : [];

    /**
     * Open WhatsApp with dealer
     * EXTRACTED FROM: home.tsx openWhatsApp function (lines 119-155)
     * Now uses communications utility
     */
    const handleWhatsAppPress = async () => {
      const dealerId = item.dealerId || item.userId || item.createdBy;

      if (!dealerId) {
        return;
      }

      await communications.openWhatsAppForProduct(
        dealerId,
        item.name,
        item.price
      );
    };

    return (
      <View style={{ height, width: SCREEN_WIDTH }} className="bg-white">
        <View className="flex-1 m-2 rounded-[28px] overflow-hidden bg-black relative">
          {/* IMAGE SLIDER */}
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            keyExtractor={(img, index) => `${item.id}-${index}`}
            renderItem={({ item: imgUri, index }) => (
              <Pressable
                onPress={() => onPressImage(images, index)}
                style={{ width: CARD_WIDTH, height: "100%" }}
              >
                <Image
                  source={{ uri: imgUri }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </Pressable>
            )}
          />

          {/* GRADIENT OVERLAY */}
          <LinearGradient
            pointerEvents="none"
            colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)"]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "55%",
            }}
          />

          {/* DEALER BADGE (Top Left) */}
          <TouchableOpacity
            onPress={() => onPressProfile(getCreatorId(item)!)}
            className="absolute top-4 left-4 flex-row items-center bg-black/40 px-3 py-2 rounded-full backdrop-blur-md"
          >
            <Image
              source={{
                uri:
                  item.dealerAvatar ||
                  `https://ui-avatars.com/api/?name=${item.dealerName || "User"}`,
              }}
              className="w-8 h-8 rounded-full border border-white/40"
            />
            <View className="ml-2">
              <Text className="text-white text-xs font-bold shadow-sm">
                {item.dealerName}
              </Text>
              <Text className="text-gray-300 text-[10px] shadow-sm">
                {item.city}
              </Text>
            </View>
          </TouchableOpacity>

          {/* BOTTOM CONTENT */}
          <View className="absolute bottom-0 w-full px-5 pb-6">
            {/* IMAGE DOTS (if multiple images) */}
            {images.length > 1 && (
              <View className="self-center flex-row gap-1.5 mb-3 bg-black/20 px-2 py-1 rounded-full backdrop-blur-sm">
                {images.map((_, i) => (
                  <View
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i === activeIndex
                        ? "bg-white w-2 h-2"
                        : "bg-white/50 w-1.5 h-1.5"
                    }`}
                  />
                ))}
              </View>
            )}

            {/* TITLE, PRICE, WHATSAPP BUTTON */}
            <View className="flex-row justify-between items-end mb-3">
              <View className="flex-1 mr-3">
                <Text className="text-white font-black text-3xl shadow-sm">
                  {item.name}
                </Text>
                <Text className="text-yellow-400 font-bold text-2xl mt-1 shadow-sm">
                  ₹{item.price}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleWhatsAppPress}
                className="bg-white h-12 w-12 rounded-full items-center justify-center shadow-lg"
              >
                <Ionicons name="chatbubble" size={20} color="#000" />
              </TouchableOpacity>
            </View>

            {/* DESCRIPTION (Expandable) */}
            <Pressable onPress={() => setExpanded(!expanded)}>
              <Text
                numberOfLines={expanded ? undefined : 2}
                className="text-gray-300 text-sm leading-5"
              >
                {item.description || "Mint condition. DM for details."}
              </Text>
              {(item.description?.length || 0) > 60 && (
                <Text className="text-gray-400 text-xs mt-1 font-bold">
                  {expanded ? "Show less" : "...more"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    );
  }
);