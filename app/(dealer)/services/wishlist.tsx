import { db } from "@/FirebaseConfig";
import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, documentId, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Wishlist() {
  const { userDoc } = useAuth(); // This has your 'wishlist' array
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check if user has a wishlist
    const wishlistIds = userDoc?.wishlist || [];
    
    if (wishlistIds.length === 0) {
      setWishlistProducts([]);
      setLoading(false);
      return;
    }

    // 2. Fetch Products where ID is in the wishlist array
    // Firestore 'in' limit is 10. For production, you'd batch this.
    // For now, we slice to 10 to prevent crashes.
    const safeIds = wishlistIds.slice(0, 10);
    
    const q = query(
      collection(db, "products"), 
      where(documentId(), "in", safeIds)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWishlistProducts(products);
      setLoading(false);
    });

    return () => unsub();
  }, [userDoc?.wishlist]);

  return (
    <View style={{ flex: 1, backgroundColor: "white", paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.replace('/(dealer)/profile')} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-xl font-black">My Wishlist</Text>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="black" />
        </View>
      ) : wishlistProducts.length === 0 ? (
        <View className="flex-1 justify-center items-center opacity-40">
          <Ionicons name="heart-dislike-outline" size={64} color="gray" />
          <Text className="font-bold mt-4">Your wishlist is empty</Text>
        </View>
      ) : (
        <FlatList 
          data={wishlistProducts}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              onPress={() => {}} // Navigate to product detail if needed
              className="flex-row bg-white mb-4 rounded-2xl overflow-hidden border border-gray-100 shadow-sm"
            >
              <Image 
                source={{ uri: item.images?.[0] }} 
                className="w-24 h-24 bg-gray-200" 
                resizeMode="cover"
              />
              <View className="flex-1 p-3 justify-center">
                <Text className="font-bold text-base mb-1">{item.name}</Text>
                <Text className="text-indigo-600 font-black text-lg">₹{item.price}</Text>
                <Text className="text-gray-400 text-xs mt-1">{item.dealerName}</Text>
              </View>
              <TouchableOpacity className="justify-center px-4">
                 <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}