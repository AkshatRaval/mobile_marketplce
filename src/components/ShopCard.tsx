// src/components/ShopCard.tsx
// Card to display a shop/profile result in the Search > Shops tab

import type { ShopResult } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

interface ShopCardProps {
    shop: ShopResult;
}

export function ShopCard({ shop }: ShopCardProps) {
    const router = useRouter();

    const initials = (shop.shopName || shop.displayName || "?")
        .charAt(0)
        .toUpperCase();

    const handlePress = () => {
        // Navigate to the public profile page
        router.push(`/profile/${shop.id}` as any);
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.75}
            className="mx-4 mb-3 bg-white rounded-2xl flex-row items-center px-4 py-3 shadow-sm"
            style={{
                borderWidth: 1,
                borderColor: "#F3F4F6",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
            }}
        >
            {/* AVATAR */}
            {shop.photoUrl ? (
                <Image
                    source={{ uri: shop.photoUrl }}
                    className="w-14 h-14 rounded-full bg-gray-100"
                    style={{ borderWidth: 2, borderColor: "#EEF2FF" }}
                />
            ) : (
                <View
                    className="w-14 h-14 rounded-full items-center justify-center"
                    style={{ backgroundColor: "#EEF2FF" }}
                >
                    <Text
                        className="text-indigo-700 font-black"
                        style={{ fontSize: 22 }}
                    >
                        {initials}
                    </Text>
                </View>
            )}

            {/* INFO */}
            <View className="flex-1 ml-4">
                {/* Shop Name */}
                <Text
                    className="text-gray-900 font-bold text-base"
                    numberOfLines={1}
                >
                    {shop.shopName || shop.displayName}
                </Text>

                {/* Display Name (if different from shop name) */}
                {shop.displayName && shop.shopName !== shop.displayName && (
                    <Text className="text-gray-500 text-xs font-medium mt-0.5" numberOfLines={1}>
                        {shop.displayName}
                    </Text>
                )}

                {/* City badge */}
                {shop.city ? (
                    <View className="flex-row items-center mt-1.5">
                        <Ionicons name="location-outline" size={12} color="#6B7280" />
                        <Text className="text-gray-500 text-xs ml-1">{shop.city}</Text>
                    </View>
                ) : null}
            </View>

            {/* ARROW */}
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
        </TouchableOpacity>
    );
}
