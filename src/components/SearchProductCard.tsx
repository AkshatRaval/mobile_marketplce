// src/components/search/SearchProductCard.tsx
// Product card for search results with image viewer
// EXTRACTED FROM: search.tsx lines 33-171 (ProductCard component)

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

// EXTRACTED FROM: search.tsx lines 26-31
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_HEIGHT = SCREEN_HEIGHT - 220;
const CARD_WIDTH = SCREEN_WIDTH - 32;

interface SearchProductCardProps {
  item: Product;
  router: any;
}

/**
 * Product Card Component for Search Results
 * EXTRACTED FROM: search.tsx lines 33-171
 * 
 * Features:
 * - Image viewer with swipe gallery
 * - WhatsApp contact button
 * - Profile navigation
 * - Expandable description
 */
export const SearchProductCard: React.FC<SearchProductCardProps> = ({
  item,
  router,
}) => {
  // ========================================
  // STATE
  // EXTRACTED FROM: search.tsx lines 35-39
  // ========================================
  
  // LINE 35: Active image being displayed
  const [activeImageUri, setActiveImageUri] = useState(item.images?.[0]);
  
  // LINE 36: Image viewer modal visibility
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  
  // LINE 37: Current image index in viewer
  const [currentViewerIndex, setCurrentViewerIndex] = useState(0);
  
  // LINE 38: Description expanded state
  const [expanded, setExpanded] = useState(false);

  // ========================================
  // COMPUTED VALUES
  // EXTRACTED FROM: search.tsx line 41
  // ========================================
  
  // LINE 41: Convert image URIs to viewer format
  const viewerImages = (item.images || []).map((uri) => ({ uri }));

  // ========================================
  // HANDLERS
  // ========================================

  /**
   * Open image viewer modal
   * EXTRACTED FROM: search.tsx lines 43-47
   */
  const openImageViewer = () => {
    // LINE 44: Find current image index
    const index = item.images?.indexOf(activeImageUri || "") ?? 0;
    
    // LINE 45: Set index (fallback to 0 if not found)
    setCurrentViewerIndex(index !== -1 ? index : 0);
    
    // LINE 46: Show viewer
    setIsViewerVisible(true);
  };

  /**
   * Open WhatsApp with product inquiry
   * EXTRACTED FROM: search.tsx lines 49-54
   */
  const openWhatsApp = () => {
    // LINE 50: Get phone number (fallback to default)
    const phoneNumber = item.dealerPhone || "919876543210";
    
    // LINE 51: Generate inquiry message
    const message = `Hi, I'm interested in the ${item.name} listed for ₹${item.price}.`;
    
    // LINE 52: Build WhatsApp URL
    const url = `whatsapp://send?text=${encodeURIComponent(message)}&phone=${phoneNumber}`;
    
    // LINE 53: Open WhatsApp (with error handling)
    Linking.openURL(url).catch(() => alert("Could not open WhatsApp"));
  };

  /**
   * Navigate to user profile
   * EXTRACTED FROM: search.tsx lines 56-64
   */
  const { user } = useAuth();
  
  const goToProfile = () => {
    // LINE 57: Check if userId exists
    if (item.userId) {
      // LINE 58-62: Navigate to own profile or other user's profile
      if (item.userId === user?.uid) {
        // LINE 59: Navigate to own profile
        router.push(`/profile/`);
      } else {
        // LINE 61: Navigate to other user's profile
        router.push(`/profile/${item.userId}`);
      }
    }
  };

  // ========================================
  // RENDER
  // EXTRACTED FROM: search.tsx lines 66-171
  // ========================================

  return (
    // CARD CONTAINER
    // EXTRACTED FROM: search.tsx lines 68-75
    <View
      style={{
        height: CARD_HEIGHT,
        width: SCREEN_WIDTH,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{ width: CARD_WIDTH, height: "96%" }}
        className="bg-white rounded-[32px] overflow-hidden relative shadow-lg border border-gray-100"
      >
        {/* MAIN IMAGE */}
        {/* EXTRACTED FROM: search.tsx lines 77-98 */}
        <Pressable onPress={openImageViewer} className="flex-1 bg-black">
          {/* LINE 79-84: Product image */}
          <Image
            source={{ uri: activeImageUri }}
            className="w-full h-full"
            resizeMode="cover"
          />
          
          {/* LINE 85-94: Gradient overlay */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.9)"]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "50%",
            }}
          />
        </Pressable>

        {/* DEALER BADGE */}
        {/* EXTRACTED FROM: search.tsx lines 100-122 */}
        <TouchableOpacity
          onPress={goToProfile}
          className="absolute top-4 left-4 flex-row items-center bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20"
        >
          {/* LINE 105-112: Dealer avatar */}
          <Image
            source={{
              uri:
                item.dealerAvatar ||
                `https://ui-avatars.com/api/?name=${item.dealerName}&background=random`,
            }}
            className="w-8 h-8 rounded-full border border-white/80"
          />
          
          {/* LINE 113-121: Dealer info */}
          <View className="ml-2">
            <Text className="text-white font-bold text-xs shadow-black">
              {item.dealerName}
            </Text>
            <Text className="text-gray-200 text-[10px] shadow-black">
              {item.city}
            </Text>
          </View>
        </TouchableOpacity>

        {/* BOTTOM INFO SECTION */}
        {/* EXTRACTED FROM: search.tsx lines 124-162 */}
        <View className="absolute bottom-0 w-full px-5 pb-6">
          {/* LINE 125-148: Title, price, and WhatsApp button */}
          <View className="flex-row items-end justify-between mb-2">
            {/* LINE 126-134: Product name and price */}
            <View className="flex-1 mr-4">
              <Text
                numberOfLines={1}
                className="text-white font-black text-2xl mb-1 shadow-md leading-tight"
              >
                {item.name}
              </Text>
              <Text className="text-yellow-400 font-bold text-xl shadow-md">
                ₹{item.price}
              </Text>
            </View>

            {/* LINE 136-144: WhatsApp button */}
            <TouchableOpacity
              onPress={openWhatsApp}
              className="bg-white rounded-full h-12 w-12 items-center justify-center shadow-xl active:scale-95"
            >
              <Ionicons name="chatbubble" size={20} color="#4F46E5" />
            </TouchableOpacity>
          </View>

          {/* LINE 150-160: Expandable description */}
          <Pressable onPress={() => setExpanded(!expanded)}>
            <Text
              numberOfLines={expanded ? undefined : 2}
              className="text-gray-300 text-sm leading-5 font-medium"
            >
              {/* LINE 154-156: Show brand/model if available */}
              {item.extractedData?.brand
                ? `[${item.extractedData.brand} ${item.extractedData.model}] ${item.description}`
                : item.description}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* IMAGE VIEWER MODAL */}
      {/* EXTRACTED FROM: search.tsx lines 164-169 */}
      <ImageView
        images={viewerImages}
        imageIndex={currentViewerIndex}
        visible={isViewerVisible}
        onRequestClose={() => setIsViewerVisible(false)}
      />
    </View>
  );
};

// Export dimensions for use in parent component
export { CARD_HEIGHT, CARD_WIDTH };
