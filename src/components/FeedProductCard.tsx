// src/components/profile/FeedProductCard.tsx
// Feed card component for profile listings
// EXTRACTED FROM: profile.tsx lines 45-152

import { getMainImage } from "@/src/utils/helpers";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
    Dimensions,
    FlatList,
    Image,
    Pressable,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface FeedProductCardProps {
  item: any;
  height: number;
  onClose: () => void;
  onPressOptions: () => void;
}

/**
 * Product card for feed view
 * EXTRACTED FROM: profile.tsx FeedProductCard component (lines 45-152)
 * 
 * Features:
 * - Image carousel
 * - Product info display
 * - Options menu button
 * - Back button
 */
export const FeedProductCard: React.FC<FeedProductCardProps> = ({
  item,
  height,
  onClose,
  onPressOptions,
}) => {
  // STATE
  // EXTRACTED FROM: profile.tsx lines 51-52
  
  // LINE 51: const [activeImageUri, setActiveImageUri] = useState(getMainImage(item));
  const [activeImageUri, setActiveImageUri] = useState(getMainImage(item));
  
  // LINE 52: const [expanded, setExpanded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    // MAIN CONTAINER
    // EXTRACTED FROM: profile.tsx lines 54-55
    <View 
      style={{ height: height, width: SCREEN_WIDTH }} 
      className="bg-black relative"
    >
      <Pressable className="flex-1 relative">
        {/* MAIN IMAGE */}
        {/* EXTRACTED FROM: profile.tsx lines 57-69 */}
        {activeImageUri ? (
          // LINE 58-62: Image display
          <Image
            source={{ uri: activeImageUri }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          // LINE 63-67: Placeholder
          <View className="w-full h-full bg-gray-900 items-center justify-center">
            <Ionicons name="image-outline" size={64} color="#333" />
          </View>
        )}

        {/* BACK BUTTON */}
        {/* EXTRACTED FROM: profile.tsx lines 71-79 */}
        <View className="absolute top-12 left-4 z-50">
          <TouchableOpacity
            onPress={onClose}
            className="bg-black/40 p-2 rounded-full backdrop-blur-md"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* GRADIENT OVERLAY */}
        {/* EXTRACTED FROM: profile.tsx lines 81-85 */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.9)"]}
          style={{ 
            position: "absolute", 
            left: 0, 
            right: 0, 
            bottom: 0, 
            height: "50%" 
          }}
        />

        {/* IMAGE THUMBNAILS */}
        {/* EXTRACTED FROM: profile.tsx lines 87-110 */}
        {item.images?.length > 1 && (
          <View className="absolute bottom-[160px] w-full pl-5">
            <FlatList
              data={item.images}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item: imgUrl }) => (
                <Pressable
                  onPress={() => setActiveImageUri(imgUrl)}
                  className={`mr-3 rounded-lg overflow-hidden border-2 shadow-sm ${
                    activeImageUri === imgUrl 
                      ? "border-white" 
                      : "border-white/30"
                  }`}
                >
                  <Image
                    source={{ uri: imgUrl }}
                    style={{ width: 40, height: 56 }}
                    className="bg-gray-800"
                  />
                </Pressable>
              )}
              keyExtractor={(_, i) => i.toString()}
            />
          </View>
        )}

        {/* PRODUCT INFO & OPTIONS BUTTON */}
        {/* EXTRACTED FROM: profile.tsx lines 112-150 */}
        <View className="absolute bottom-0 w-full px-5 pb-10">
          {/* TITLE, PRICE, AND OPTIONS BUTTON */}
          {/* EXTRACTED FROM: profile.tsx lines 113-134 */}
          <View className="flex-row items-end justify-between mb-2">
            {/* PRODUCT NAME AND PRICE */}
            {/* EXTRACTED FROM: profile.tsx lines 114-121 */}
            <View className="flex-1 mr-4">
              <Text className="text-white font-black text-3xl mb-1 shadow-sm leading-tight">
                {item.name}
              </Text>
              <Text className="text-yellow-400 font-bold text-2xl shadow-sm">
                ₹{item.price}
              </Text>
            </View>
            
            {/* 3 DOTS MENU BUTTON */}
            {/* EXTRACTED FROM: profile.tsx lines 123-129 */}
            <TouchableOpacity 
              onPress={onPressOptions}
              className="bg-white/20 p-2 rounded-full backdrop-blur-md"
            >
              <Ionicons name="ellipsis-horizontal" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* EXPANDABLE DESCRIPTION */}
          {/* EXTRACTED FROM: profile.tsx lines 136-144 */}
          <Pressable onPress={() => setExpanded(!expanded)}>
            <Text
              numberOfLines={expanded ? undefined : 2}
              className="text-gray-300 text-sm leading-5"
            >
              {item.description || "No description provided."}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
};