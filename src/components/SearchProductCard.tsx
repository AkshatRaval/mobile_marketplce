import { useAuth } from "@/src/context/AuthContext";
import type { Product } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Linking,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ImageView from "react-native-image-viewing";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// 📐 FIXED DIMENSIONS to prevent UI breaking
export const CARD_HEIGHT = 140;
const IMAGE_WIDTH = 130;

interface SearchProductCardProps {
  item: Product;
}

export const SearchProductCard: React.FC<SearchProductCardProps> = ({
  item,
}) => {
  const router = useRouter();
  const { user } = useAuth();

  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // 🖼️ Safe Image Array
  const images =
    item.images && item.images.length > 0 ? item.images : [item.image || ""];
  const viewerImages = images.map((uri) => ({ uri }));

  // 🔗 WhatsApp Action
  const openWhatsApp = () => {
    const phoneNumber = item.dealerPhone;
    if (!phoneNumber) {
      alert("Dealer number not available.");
      return;
    }
    const message = `Hi, I'm interested in: ${item.name} - ₹${item.price}`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}&phone=${phoneNumber}`;
    Linking.openURL(url).catch(() => alert("Could not open WhatsApp"));
  };

  // 🔗 Profile Action
  const goToProfile = () => {
    if (!item.userId) return;
    const currentUserId = user?.id || (user as any)?.uid;

    if (item.userId === currentUserId) {
      router.push("/profile" as any);
    } else {
      router.push(`/profile/${item.userId}` as any);
    }
  };

  // 👤 Dealer Data
  const dealerName = item.dealerName || "Dealer";
  // Default avatar if missing
  const dealerAvatar =
    item.dealerAvatar ||
    item.dealerPhoto ||
    `https://ui-avatars.com/api/?name=${dealerName}&background=random&color=fff&background=000`;

  return (
    <View
      style={{ width: SCREEN_WIDTH, paddingHorizontal: 12, marginBottom: 12 }}
    >
      {/* 📦 CARD CONTAINER */}
      <View
        style={{ height: CARD_HEIGHT, elevation: 2 }} // Added elevation for Android shadow
        className="flex-row bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        {/* 👈 LEFT: IMAGE AREA */}
        <View
          style={{
            width: IMAGE_WIDTH,
            height: "100%",
            backgroundColor: "#F3F4F6",
          }}
        >
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => `img-${item.id}-${i}`}
            renderItem={({ item: imgUri }) => (
              <Pressable onPress={() => setIsViewerVisible(true)}>
                {imgUri ? (
                  <Image
                    source={{ uri: imgUri }}
                    style={{ width: IMAGE_WIDTH, height: CARD_HEIGHT }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{ width: IMAGE_WIDTH, height: CARD_HEIGHT }}
                    className="items-center justify-center"
                  >
                    <Ionicons name="image" size={32} color="#D1D5DB" />
                  </View>
                )}
              </Pressable>
            )}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(
                e.nativeEvent.contentOffset.x / IMAGE_WIDTH
              );
              setActiveIndex(index);
            }}
          />

          {/* Dots */}
          {images.length > 1 && (
            <View className="absolute bottom-2 w-full flex-row justify-center gap-1">
              {images.map((_, i) => (
                <View
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${i === activeIndex ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </View>
          )}
        </View>

        {/* 👉 RIGHT: DETAILS AREA */}
        <View className="flex-1 p-3 flex-col justify-between">
          {/* Top Section */}
          <View>
            <View className="flex-row justify-between items-start gap-2">
              <Text
                numberOfLines={2}
                className="text-gray-900 font-bold text-sm flex-1 leading-5"
              >
                {item.name}
              </Text>

              {/* 3-Dots Menu */}
              <TouchableOpacity
                onPress={goToProfile}
                className="p-1 -mr-2 -mt-2"
              >
                <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <Text className="text-green-700 font-extrabold text-base mt-1">
              ₹{Number(item.price).toLocaleString()}
            </Text>
          </View>

          {/* Middle: Dealer Row */}
          <View className="flex-row items-center mt-1">
            <Image
              source={{ uri: dealerAvatar }}
              className="w-4 h-4 rounded-full border border-gray-200"
            />
            <Text
              numberOfLines={1}
              className="text-xs text-gray-500 ml-1.5 font-medium flex-1"
            >
              {dealerName} • {item.city || "India"}
            </Text>
          </View>

          <View className="flex-row gap-3 mt-auto pt-3 border-t border-gray-50">
            {/* Primary: Chat (Emerald Green) */}
            <TouchableOpacity
              onPress={openWhatsApp}
              className="flex-1 bg-black h-10 rounded-xl flex-row items-center justify-center shadow-sm active:bg-emerald-700"
            >
              <Ionicons name="chatbubble-ellipses" size={18} color="white" />
              <Text className="text-white font-bold text-sm ml-2 tracking-wide">
                Chat
              </Text>
            </TouchableOpacity>

            {/* Secondary: Profile (Soft Gray Square) */}
            <TouchableOpacity
              onPress={goToProfile}
              className="w-10 h-10 bg-gray-100 rounded-xl items-center justify-center active:bg-gray-200"
            >
              <Ionicons name="person-outline" size={20} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 🖼️ Full Screen Viewer */}
      <ImageView
        images={viewerImages}
        imageIndex={activeIndex}
        visible={isViewerVisible}
        onRequestClose={() => setIsViewerVisible(false)}
      />
    </View>
  );
};

export const CARD_WIDTH = SCREEN_WIDTH;
