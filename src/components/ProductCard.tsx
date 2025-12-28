// src/components/ProductCard.tsx
// FIXED - No overlaps, proper spacing

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

export const ProductCard = React.memo(
  ({ item, height, onPressProfile, onPressImage }: ProductCardProps) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [expanded, setExpanded] = useState(false);

    const onViewableItemsChanged = useRef(
      ({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems[0]?.index != null) {
          setActiveIndex(viewableItems[0].index);
        }
      }
    ).current;

    const viewabilityConfig = useRef({
      viewAreaCoveragePercentThreshold: 60,
    }).current;

    const images =
      item.images?.length > 0
        ? item.images
        : item.image
        ? [item.image]
        : [];

    const handleWhatsAppPress = async () => {
      const dealerId = item.dealerId || item.userId || item.createdBy;
      if (!dealerId) return;

      await communications.openWhatsAppForProduct(
        dealerId,
        item.name,
        item.price
      );
    };

    return (
      <View style={{ height, width: SCREEN_WIDTH, backgroundColor: 'white' }}>
        {/* Card Container with margins */}
        <View style={{ 
          flex: 1, 
          marginHorizontal: 8,
          marginVertical: 4,
          borderRadius: 28, 
          overflow: 'hidden', 
          backgroundColor: 'black',
        }}>
          
          {/* IMAGE SLIDER */}
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            keyExtractor={(_, index) => `${item.id}-${index}`}
            renderItem={({ item: imgUri, index }) => (
              <Pressable
                onPress={() => onPressImage(images, index)}
                style={{ width: SCREEN_WIDTH - 16 }}
              >
                <Image
                  source={{ uri: imgUri }}
                  style={{ width: "100%", height: height - 8 }}
                  resizeMode="cover"
                />
              </Pressable>
            )}
          />

          {/* GRADIENT OVERLAY */}
          <LinearGradient
            pointerEvents="none"
            colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.9)"]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: height * 0.5,
            }}
          />

          {/* DEALER BADGE - TOP */}
          <TouchableOpacity
            onPress={() => onPressProfile(getCreatorId(item)!)}
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.4)',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
            }}
          >
            <Image
              source={{
                uri:
                  item.dealerAvatar ||
                  `https://ui-avatars.com/api/?name=${item.dealerName || "User"}`,
              }}
              style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' }}
            />
            <View style={{ marginLeft: 8 }}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>
                {item.dealerName}
              </Text>
              <Text style={{ color: '#D1D5DB', fontSize: 10 }}>
                {item.city}
              </Text>
            </View>
          </TouchableOpacity>

          {/* BOTTOM CONTENT - PROPER SPACING */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 20,
              paddingBottom: 24,
            }}
          >
            {/* IMAGE DOTS */}
            {images.length > 1 && (
              <View style={{
                alignSelf: 'center',
                flexDirection: 'row',
                gap: 6,
                marginBottom: 12,
                backgroundColor: 'rgba(0,0,0,0.2)',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 999,
              }}>
                {images.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      borderRadius: 999,
                      backgroundColor: i === activeIndex ? 'white' : 'rgba(255,255,255,0.5)',
                      width: i === activeIndex ? 8 : 6,
                      height: i === activeIndex ? 8 : 6,
                    }}
                  />
                ))}
              </View>
            )}

            {/* TITLE + PRICE + CHAT BUTTON */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 28, lineHeight: 32 }} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={{ color: '#FBBF24', fontWeight: '700', fontSize: 22, marginTop: 4 }}>
                  ₹{item.price}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleWhatsAppPress}
                style={{
                  backgroundColor: 'white',
                  height: 48,
                  width: 48,
                  borderRadius: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="chatbubble" size={20} color="#000" />
              </TouchableOpacity>
            </View>

            {/* DESCRIPTION - COMPACT */}
            <Pressable onPress={() => setExpanded(!expanded)}>
              <Text
                numberOfLines={expanded ? 4 : 2}
                style={{ color: '#D1D5DB', fontSize: 13, lineHeight: 18 }}
              >
                {item.description || "Mint condition. DM for details."}
              </Text>
              {(item.description?.length || 0) > 60 && (
                <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 4, fontWeight: '700' }}>
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