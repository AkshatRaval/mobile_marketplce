import { FeedProductCard } from "@/src/components/FeedProductCard";
import { supabase } from "@/src/supabaseConfig";
import { Product } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, SafeAreaView, StatusBar, Text, TouchableOpacity, View } from "react-native";

export default function ProductDeepLinkScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const screenHeight = Dimensions.get("window").height;

  useEffect(() => {
    async function fetchProduct() {
      if (!id || typeof id !== "string") {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error: supaError } = await supabase
          .from("products")
          .select(`*, users!products_user_id_fkey(id, display_name, photo_url, phone)`)
          .eq("id", id)
          .single();

        if (supaError || !data) {
          setError(true);
        } else {
          // Format Data to exactly match FeedProductCard requirements
          setProduct({
            ...data,
            dealerName: data.users?.display_name,
            dealerImage: data.users?.photo_url,
            dealerPhone: data.users?.phone,
          } as any);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0A", justifyContent: "center", alignItems: "center" }}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0A", justifyContent: "center", alignItems: "center" }}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="alert-circle-outline" size={64} color="#666" />
        <Text style={{ color: "white", fontSize: 18, fontWeight: "bold", marginTop: 16 }}>Product not found</Text>
        <Text style={{ color: "#999", fontSize: 14, marginTop: 8 }}>The link may be invalid or the item was sold.</Text>
        
        <TouchableOpacity 
          onPress={() => router.replace("/(auth)/login")}
          style={{ marginTop: 32, backgroundColor: "white", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }}
        >
          <Text style={{ color: "black", fontWeight: "bold" }}>Go to Go Dealers</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      <StatusBar hidden />
      {/* We pass a fixed height based on window because the feed expects absolute height */}
      <FeedProductCard
        item={product}
        height={screenHeight}
        onClose={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(auth)/login");
          }
        }}
      />
    </View>
  );
}
