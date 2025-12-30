// src/components/search/SearchProductCard.tsx
// ✨ REDEMPTION UI: Premium, Immersive, Dark-Mode Aesthetic

import { useAuth } from "@/src/context/AuthContext";
import type { Product } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Linking,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ImageView from "react-native-image-viewing";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
// Tall, cinematic aspect ratio
const CARD_HEIGHT = SCREEN_HEIGHT * 0.60;
const CARD_WIDTH = SCREEN_WIDTH - 24;

interface SearchProductCardProps {
  item: Product;
  router: any;
}

export const SearchProductCard: React.FC<SearchProductCardProps> = ({
  item,
  router,
}) => {
  const [activeImageUri, setActiveImageUri] = useState(item.images?.[0]);
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [currentViewerIndex, setCurrentViewerIndex] = useState(0);

  const viewerImages = (item.images || []).map((uri) => ({ uri }));
  const { user } = useAuth();

  const openImageViewer = () => {
    const index = item.images?.indexOf(activeImageUri || "") ?? 0;
    setCurrentViewerIndex(index !== -1 ? index : 0);
    setIsViewerVisible(true);
  };

  const openWhatsApp = () => {
    const phoneNumber = item.dealerPhone || "919876543210";
    const message = `Hi, I'm interested in the ${item.name} listed for ₹${item.price}.`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}&phone=${phoneNumber}`;
    Linking.openURL(url).catch(() => alert("Could not open WhatsApp"));
  };

  const goToProfile = () => {
    if (item.userId) {
      const path = item.userId === user?.uid ? "/profile/" : `/profile/${item.userId}`;
      router.push(path);
    }
  };

  return (
    <View
      style={{
        width: SCREEN_WIDTH,
        height: CARD_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
      }}
    >
      {/* === CARD CONTAINER === */}
      <View
        style={{ width: CARD_WIDTH, height: "100%" }}
        className="bg-black rounded-[30px] overflow-hidden relative shadow-2xl shadow-black"
      >
        {/* 1. FULL BACKGROUND IMAGE */}
        <Pressable onPress={openImageViewer} className="w-full h-full relative">
          <Image
            source={{ uri: activeImageUri }}
            className="w-full h-full bg-gray-900"
            resizeMode="cover"
          />
          
          {/* Heavy Bottom Gradient for Text Readability */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.95)", "black"]}
            locations={[0, 0.5, 0.8, 1]}
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "55%" }}
          />

          {/* Top Gradient for Header */}
          <LinearGradient
            colors={["rgba(0,0,0,0.6)", "transparent"]}
            style={{ position: "absolute", top: 0, left: 0, right: 0, height: 100 }}
          />
        </Pressable>

        {/* 2. TOP HEADER: Dealer Left, Price Right (No Overlap) */}
        <View className="absolute top-0 w-full flex-row justify-between items-start p-4 pt-5">
          {/* Dealer Pill */}
          <TouchableOpacity 
            onPress={goToProfile}
            className="flex-row items-center bg-black/40 px-2 py-1.5 rounded-full border border-white/10 backdrop-blur-md"
          >
            <Image
              source={{
                uri: item.dealerAvatar || `https://ui-avatars.com/api/?name=${item.dealerName}&background=random`,
              }}
              className="w-7 h-7 rounded-full border border-white/20"
            />
            <Text numberOfLines={1} className="text-white font-bold text-xs ml-2 mr-1 max-w-[100px]">
              {item.dealerName}
            </Text>
          </TouchableOpacity>

          {/* Price Badge (High Visibility) */}
          <View className="bg-green-500 px-3 py-1.5 rounded-full shadow-lg">
            <Text className="text-white font-black text-sm">
              ₹ {parseInt(item.price).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* 3. BOTTOM INFO & ACTIONS */}
        <View className="absolute bottom-0 w-full px-5 pb-6">
          {/* Gallery Indicator (Small) */}
          <View className="flex-row items-center mb-2">
            <View className="bg-white/20 px-2 py-0.5 rounded-md flex-row items-center">
              <Ionicons name="images" size={10} color="white" />
              <Text className="text-white text-[10px] ml-1 font-bold">
                {item.images?.length || 1} Photos
              </Text>
            </View>
            <Text className="text-gray-400 text-[10px] ml-2 uppercase font-bold tracking-wider">
              {item.city}
            </Text>
          </View>

          {/* Title (Large & Readable) */}
          <Text 
            numberOfLines={2} 
            className="text-white font-black text-2xl leading-7 mb-1 shadow-black"
          >
            {item.name}
          </Text>

          {/* Description Snippet */}
          <Text numberOfLines={1} className="text-gray-400 text-xs mb-5 font-medium">
            {item.description}
          </Text>

          {/* Action Row */}
          <View className="flex-row items-center gap-3">
             {/* Main Action: WhatsApp */}
            <TouchableOpacity
              onPress={openWhatsApp}
              className="flex-1 bg-white h-12 rounded-2xl flex-row items-center justify-center active:bg-gray-200"
            >
              <Ionicons name="logo-whatsapp" size={20} color="black" />
              <Text className="text-black font-extrabold text-base ml-2">
                Chat Now
              </Text>
            </TouchableOpacity>

            {/* Secondary Action: Profile/More */}
            <TouchableOpacity
              onPress={goToProfile}
              className="h-12 w-12 bg-white/10 rounded-2xl items-center justify-center border border-white/10 active:bg-white/20"
            >
              <Ionicons name="arrow-forward" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Image Viewer */}
      <ImageView
        images={viewerImages}
        imageIndex={currentViewerIndex}
        visible={isViewerVisible}
        onRequestClose={() => setIsViewerVisible(false)}
      />
    </View>
  );
};

export { CARD_HEIGHT, CARD_WIDTH };
