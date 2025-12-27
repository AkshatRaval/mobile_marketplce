import { db } from "@/FirebaseConfig";
import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  Linking,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ImageView from "react-native-image-viewing";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Product } from '@/src/types/index';

// --- DIMENSIONS ---
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Calculate card height (approx 75% of screen to fit nicely between header and tab bar)
// You can adjust '220' to account for your specific Header + TabBar height
const CARD_HEIGHT = SCREEN_HEIGHT - 220;
const CARD_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side

// --- PRODUCT CARD ---
const ProductCard: React.FC<{ item: Product; router: any }> = ({
  item,
  router,
}) => {
  const [activeImageUri, setActiveImageUri] = useState(item.images?.[0]);
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [currentViewerIndex, setCurrentViewerIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const viewerImages = (item.images || []).map((uri) => ({ uri }));

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

  const { user } = useAuth();
  const goToProfile = () => {
    if (item.userId) {
      if (item.userId === user?.uid) {
        router.push(`/profile/`);
      } else {
        router.push(`/profile/${item.userId}`);
      }
    }
  };

  return (
    // CARD CONTAINER (Fixed Height for Snapping)
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
        {/* 1. MAIN IMAGE */}
        <Pressable onPress={openImageViewer} className="flex-1 bg-black">
          <Image
            source={{ uri: activeImageUri }}
            className="w-full h-full"
            resizeMode="cover"
          />
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

        {/* 2. DEALER BADGE (Floating Top Left) */}
        <TouchableOpacity
          onPress={goToProfile}
          className="absolute top-4 left-4 flex-row items-center bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20"
        >
          <Image
            source={{
              uri:
                item.dealerAvatar ||
                `https://ui-avatars.com/api/?name=${item.dealerName}&background=random`,
            }}
            className="w-8 h-8 rounded-full border border-white/80"
          />
          <View className="ml-2">
            <Text className="text-white font-bold text-xs shadow-black">
              {item.dealerName}
            </Text>
            <Text className="text-gray-200 text-[10px] shadow-black">
              {item.city}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 3. BOTTOM INFO */}
        <View className="absolute bottom-0 w-full px-5 pb-6">
          <View className="flex-row items-end justify-between mb-2">
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

            <TouchableOpacity
              onPress={openWhatsApp}
              className="bg-white rounded-full h-12 w-12 items-center justify-center shadow-xl active:scale-95"
            >
              <Ionicons name="chatbubble" size={20} color="#4F46E5" />
            </TouchableOpacity>
          </View>

          <Pressable onPress={() => setExpanded(!expanded)}>
            <Text
              numberOfLines={expanded ? undefined : 2}
              className="text-gray-300 text-sm leading-5 font-medium"
            >
              {item.extractedData?.brand
                ? `[${item.extractedData.brand} ${item.extractedData.model}] ${item.description}`
                : item.description}
            </Text>
          </Pressable>
        </View>
      </View>

      <ImageView
        images={viewerImages}
        imageIndex={currentViewerIndex}
        visible={isViewerVisible}
        onRequestClose={() => setIsViewerVisible(false)}
      />
    </View>
  );
};

// --- MAIN SEARCH PAGE ---
export default function SearchPage() {
  const router = useRouter();

  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    Keyboard.dismiss();
    setLoading(true);
    setHasSearched(true);
    setResults([]);

    try {
      const q = query(
        collection(db, "products"),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      const querySnapshot = await getDocs(q);
      const searchTerms = searchText
        .toLowerCase()
        .split(" ")
        .filter((t) => t.length > 0);
      const filteredData: Product[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const fullText =
          `${data.name} ${data.description} ${data.dealerName} ${data.extractedData?.brand} ${data.extractedData?.model}`.toLowerCase();

        if (searchTerms.every((term) => fullText.includes(term))) {
          filteredData.push({ id: doc.id, ...data } as Product);
        }
      });
      setResults(filteredData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View className="px-4 pb-2 border-b border-gray-100 z-10 bg-white">
        <Text className="text-2xl font-black text-gray-900 mb-4 mt-2">
          Search
        </Text>
        <View className="flex-row items-center space-x-2 mb-2">
          <View className="flex-1 bg-gray-100 rounded-xl flex-row items-center px-4 py-3">
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              className="flex-1 ml-3 text-gray-900 font-medium text-base"
              placeholder="iPhone 15, Samsung..."
              placeholderTextColor="#9CA3AF"
              returnKeyType="search"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={handleSearch}
            className="bg-indigo-600 rounded-xl p-3.5"
          >
            <Ionicons name="arrow-forward" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* RESULT LIST */}
      <View className="flex-1 bg-gray-50">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : !hasSearched ? (
          <View className="flex-1 justify-center items-center opacity-40 pb-20">
            <Ionicons name="search-outline" size={80} color="#CBD5E1" />
            <Text className="text-gray-400 mt-4 font-medium">
              Type to search inventory
            </Text>
          </View>
        ) : results.length === 0 ? (
          <View className="flex-1 justify-center items-center pb-20">
            <Ionicons name="alert-outline" size={50} color="#64748B" />
            <Text className="text-gray-900 font-bold text-lg mt-4">
              No Results Found
            </Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ProductCard item={item} router={router} />
            )}
            // --- REELS-STYLE SNAPPING MAGIC ---
            snapToInterval={CARD_HEIGHT} // Snap exactly to the card height
            snapToAlignment="start" // Align top of card to top of list container
            decelerationRate="fast" // Stop scrolling quickly
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: 20, // Extra padding at bottom so last card lifts up
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
