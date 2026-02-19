import { supabase } from "@/src/supabaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function ProductDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [product, setProduct] = useState<any>(null);
    const [dealer, setDealer] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (!id) return;

                // Fetch Product
                const { data: productData, error: productError } = await supabase
                    .from("products")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (productError) throw productError;
                setProduct(productData);

                // Fetch Seller (Dealer)
                if (productData.user_id) {
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("*")
                        .eq("id", productData.user_id)
                        .single();
                    setDealer(profile);
                }

            } catch (error: any) {
                Alert.alert("Error", "Could not load product.");
                router.back();
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleDelete = () => {
        Alert.alert("Delete Listing?", "This action cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        const { error } = await supabase.from("products").delete().eq("id", id);
                        if (error) throw error;
                        router.back(); // Go back to dashboard/inventory
                    } catch (e) {
                        Alert.alert("Error", "Could not delete.");
                    }
                },
            },
        ]);
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    if (!product) return null;

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View className="px-6 py-4 flex-row items-center justify-between border-b border-gray-100 bg-white z-10">
                <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center">
                    <Ionicons name="arrow-back" size={20} color="black" />
                </TouchableOpacity>
                <Text className="font-bold text-gray-500 uppercase text-xs">Product Details</Text>
                <TouchableOpacity onPress={handleDelete} className="w-10 h-10 bg-red-50 rounded-full items-center justify-center">
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Image */}
                <View className="w-full h-80 bg-gray-100">
                    <Image
                        source={{ uri: product.images?.[0] }}
                        className="w-full h-full"
                        resizeMode="cover"
                    />
                    <View className="absolute bottom-4 right-4 bg-black/70 px-3 py-1 rounded-full">
                        <Text className="text-white text-xs font-bold">1/{product.images?.length || 1}</Text>
                    </View>
                </View>

                <View className="p-6">
                    <Text className="text-3xl font-black text-gray-900 leading-tight mb-2">{product.name}</Text>
                    <Text className="text-2xl font-bold text-indigo-600 mb-6">₹{product.price}</Text>

                    {/* Seller Info */}
                    {dealer && (
                        <TouchableOpacity
                            onPress={() => router.push(`/dealer/${dealer.id}`)}
                            className="flex-row items-center bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-8 active:bg-gray-100"
                        >
                            <Image
                                source={{ uri: `https://ui-avatars.com/api/?name=${dealer.display_name}&background=random` }}
                                className="w-12 h-12 rounded-full border-2 border-white mr-4"
                            />
                            <View className="flex-1">
                                <Text className="text-xs text-gray-400 font-bold uppercase">Sold by</Text>
                                <Text className="text-lg font-bold text-gray-900">{dealer.display_name}</Text>
                                <Text className="text-xs text-gray-500">{dealer.shop_name}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}

                    {/* Description */}
                    <View>
                        <Text className="text-lg font-bold text-gray-900 mb-2">Description</Text>
                        <Text className="text-gray-500 leading-6">{product.description || "No description provided."}</Text>
                    </View>

                    {/* Metadata Grid */}
                    <View className="flex-row flex-wrap mt-8 -mx-2">
                        <View className="w-1/2 px-2 mb-4">
                            <View className="bg-gray-50 p-3 rounded-xl">
                                <Text className="text-gray-400 text-[10px] font-bold uppercase">Condition</Text>
                                <Text className="text-gray-900 font-bold">{product.condition || "Used"}</Text>
                            </View>
                        </View>
                        <View className="w-1/2 px-2 mb-4">
                            <View className="bg-gray-50 p-3 rounded-xl">
                                <Text className="text-gray-400 text-[10px] font-bold uppercase">Brand</Text>
                                <Text className="text-gray-900 font-bold">{product.brand || "N/A"}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

        </SafeAreaView>
    );
}
