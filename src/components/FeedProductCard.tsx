import { getMainImage } from "@/src/utils/helpers";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
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

export const FeedProductCard: React.FC<FeedProductCardProps> = ({
  item,
  height,
  onClose,
  onPressOptions,
}) => {
  const [activeImageUri, setActiveImageUri] = useState<string | null>(
    getMainImage(item)
  );
  const [expanded, setExpanded] = useState(false);

  // 📐 Dimensions: Tall, sleek card
  const CARD_WIDTH = SCREEN_WIDTH * 0.92;
  const CARD_HEIGHT = height * 0.82;

  return (
    <View
      style={{ height: height, width: SCREEN_WIDTH }}
      className="justify-center items-center bg-black/90"
    >
      <StatusBar hidden />

      {/* 1. BLURRED AMBIENT BACKGROUND */}
      {activeImageUri ? (
        <View style={StyleSheet.absoluteFill}>
          <Image
            source={{ uri: activeImageUri || "" }}
            style={{ width: "100%", height: "100%", opacity: 0.4 }}
            blurRadius={80}
          />
        </View>
      ) : null}

      {/* 2. MAIN CARD */}
      <View
        style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
        className="bg-gray-900 rounded-3xl overflow-hidden shadow-2xl elevation-20 relative"
      >
        {/* === A. THE IMAGE (Background) === */}
        {activeImageUri ? (
          <Image
            source={{ uri: activeImageUri || "" }}
            className="w-full h-full bg-gray-800"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full bg-gray-800 items-center justify-center">
            <Ionicons name="image-outline" size={64} color="#555" />
          </View>
        )}

        {/* === B. TOP BUTTONS (Floating & Working) === */}
        <View
          className="absolute top-0 left-0 right-0 p-5 flex-row justify-between z-50"
          pointerEvents="box-none"
        >
          {/* Close (Glass Effect) */}
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            className="w-11 h-11 rounded-full items-center p-2  justify-center bg-white"
          >
            <Ionicons name="close" size={24} color="black" />
          </TouchableOpacity>
        </View>

        {/* === C. BOTTOM CONTENT (Gradient) === */}
        <LinearGradient
          colors={[
            "transparent",
            "rgba(0,0,0,0.2)",
            "rgba(0,0,0,0.8)",
            "black",
          ]}
          locations={[0, 0.2, 0.6, 1]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "55%",
            justifyContent: "flex-end",
            paddingHorizontal: 20,
            paddingBottom: 24,
          }}
          pointerEvents="box-none" // Allows touches to pass through empty space
        >
          {/* 1. Thumbnail Gallery */}
          {item.images?.length > 1 && (
            <View className="mb-4">
              <FlatList
                data={item.images}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item: imgUrl }) => (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setActiveImageUri(imgUrl)}
                    className={`mr-3 rounded-xl overflow-hidden border-2 ${
                      activeImageUri === imgUrl
                        ? "border-emerald-500"
                        : "border-white/30"
                    }`}
                    style={{ height: 50, width: 40 }}
                  >
                    <Image
                      source={{ uri: imgUrl || "" }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
                keyExtractor={(_, i) => i.toString()}
              />
            </View>
          )}

          {/* 2. Price Tag (Floating Pill) */}
          <Text
            className="text-white font-black text-3xl leading-9 shadow-sm mb-1"
            numberOfLines={2}
          >
            {item.name}
          </Text>
          
          <View className="self-start py-1 rounded-full mb-2">
            <Text className="text-white font-bold text-lg">
              ₹{Number(item.price).toLocaleString()}
            </Text>
          </View>


          {/* 4. Description (Expandable) */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setExpanded(!expanded)}
          >
            <Text
              numberOfLines={expanded ? undefined : 2}
              className="text-gray-300 text-sm leading-5 font-medium opacity-90"
            >
              {item.description || "No description provided."}
            </Text>
          </TouchableOpacity>
          <View className="absolute bottom-0 right-0 p-5 flex-row justify-between z-50 ">
            <TouchableOpacity
              onPress={onPressOptions}
              activeOpacity={0.7}
              className="w-11 h-11 rounded-full p-2 items-center justify-center bg-gray-600"
            >
              <Ionicons name="ellipsis-horizontal" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
};
