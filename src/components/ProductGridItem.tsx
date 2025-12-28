// src/components/ProductGridItem.tsx
// FIXED - Will definitely show

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

interface ProductGridItemProps {
  item: any;
  width: number;
  onPress: () => void;
}

export const ProductGridItem: React.FC<ProductGridItemProps> = ({
  item,
  width,
  onPress,
}) => {
  if (!item) return null;

  const imageUri = item.images?.[0] || item.image || "";
  const price = item.price || "0";
  const name = item.name || "Unknown Product";
  const storage = item.extractedData?.storageGb;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={{
        width: width,
        backgroundColor: 'white',
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden',
      }}
    >
      {/* Product Image */}
      <View style={{ height: 160, backgroundColor: '#F3F4F6', position: 'relative' }}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ width: '100%', height: '100%', backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="image-outline" size={40} color="#9CA3AF" />
          </View>
        )}
        
        {/* Price Badge */}
        <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>
            ₹{parseInt(price).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Product Info */}
      <View style={{ padding: 12 }}>
        <Text
          numberOfLines={1}
          style={{ fontWeight: '700', color: '#111827', fontSize: 14, marginBottom: 4, lineHeight: 20 }}
        >
          {name}
        </Text>
        <Text numberOfLines={1} style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 8 }}>
          {storage ? `${storage}GB` : "Mint Condition"}
        </Text>
        <Text style={{ color: '#4F46E5', fontSize: 12, fontWeight: '700' }}>
          View Image
        </Text>
      </View>
    </TouchableOpacity>
  );
};