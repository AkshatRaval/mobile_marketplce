import { db } from "@/FirebaseConfig";
import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { getAuth } from "firebase/auth";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Pressable,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ImageView from "react-native-image-viewing";
import { SafeAreaView } from "react-native-safe-area-context";

interface Product {
  id: string;
  userId?: string;
  ownerId?: string;
  postedBy?: string;
  createdBy?: string;
  name: string;
  price: string;
  images: string[];
  description: string;
  dealerName: string;
  dealerAvatar?: string;
  dealerPhone?: string;
  city: string;
  tags?: string[];
  createdAt: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const ProductCard: React.FC<{ item: Product; height: number }> = ({ item, height }) => {
  const [activeImageUri, setActiveImageUri] = useState(item.images?.[0]);
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [currentViewerIndex, setCurrentViewerIndex] = useState(0);
  
  // New state for expanding description
  const [expanded, setExpanded] = useState(false);

  const viewerImages = (item.images || []).map((uri) => ({ uri }));

  const openImageViewer = () => {
    const index = item.images?.indexOf(activeImageUri || "") ?? 0;
    setCurrentViewerIndex(index !== -1 ? index : 0);
    setIsViewerVisible(true);
  };

  const openWhatsApp = () => {
    const phoneNumber = item.dealerPhone || "";
    const message = `Hi, I'm interested in the ${item.name} listed for ₹${item.price}.`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}&phone=${phoneNumber}`;
    Linking.openURL(url).catch(() => alert("Could not open WhatsApp"));
  };

  const goToProfile = () => {
    const uid = item.userId || item.ownerId || item.postedBy || item.createdBy;
    if (uid) router.push(`/profile/${uid}`);
  };

  return (
    <View style={{ height, width: SCREEN_WIDTH }} className="bg-white border-b border-gray-100">
      <View className="flex-1 m-2 rounded-[30px] overflow-hidden relative bg-black">
        
        {/* 1. MAIN IMAGE & LIGHTER GRADIENT */}
        <Pressable onPress={openImageViewer} className="w-full h-full">
          <Image source={{ uri: activeImageUri }} className="w-full h-full" resizeMode="cover" />
          
          {/* Lighter Gradient: Stopped at 0.6 opacity and reduced height to 40% */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.8)"]}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "40%" }}
          />
        </Pressable>

        {/* 2. TOP-LEFT PROFILE HEADER (New Location) */}
        <TouchableOpacity 
          onPress={goToProfile} 
          className="absolute top-4 left-4 flex-row items-center bg-black/40 px-3 py-2 rounded-full backdrop-blur-md"
        >
          <Image
            source={{
              uri: item.dealerAvatar || `https://ui-avatars.com/api/?name=${item.dealerName}&background=random`,
            }}
            className="w-8 h-8 rounded-full border border-white/50"
          />
          <View className="ml-2">
            <Text className="text-white font-bold text-xs shadow-black">{item.dealerName}</Text>
            {/* Using city or shopName as subtext */}
            <Text className="text-gray-200 text-[10px] shadow-black">{item.city}</Text>
          </View>
        </TouchableOpacity>

        {/* 3. BOTTOM INFO & ACTIONS */}
        <View className="absolute bottom-0 w-full px-5 pb-6">
          <View className="flex-row items-end justify-between mb-3">
             {/* Title & Price */}
             <View className="flex-1 mr-4">
                <Text className="text-white font-black text-3xl mb-1 shadow-sm leading-tight">
                  {item.name}
                </Text>
                <Text className="text-yellow-400 font-bold text-2xl shadow-sm">
                  ₹{item.price}
                </Text>
             </View>

             {/* Chat Button (Right Aligned) */}
             <TouchableOpacity 
               onPress={openWhatsApp} 
               className="bg-white rounded-full h-12 w-12 items-center justify-center shadow-lg"
             >
               <Ionicons name="chatbubble" size={20} color="black" />
             </TouchableOpacity>
          </View>

          {/* Expandable Description */}
          <Pressable onPress={() => setExpanded(!expanded)}>
            <Text 
              numberOfLines={expanded ? undefined : 2} 
              className="text-gray-300 text-sm leading-5"
            >
              {item.description || "Mint condition. DM for more details."}
            </Text>
            {/* Show "More/Less" text if description is somewhat long */}
            {(item.description?.length || 0) > 60 && (
               <Text className="text-gray-500 text-xs mt-1 font-bold">
                 {expanded ? "Show Less" : "...more"}
               </Text>
            )}
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

export default function DealerHome() {
  const { userDoc } = useAuth();
  const [activeTab, setActiveTab] = useState<"explore" | "connections">("explore");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const REEL_HEIGHT = SCREEN_HEIGHT - 195;

  useEffect(() => {
    setLoading(true);

    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedProducts: Product[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));

      const connections = userDoc?.connections || [];

      // REAL current user id – bulletproof
      const authUid = getAuth().currentUser?.uid;

      const possibleUserIds = [
        authUid,
        userDoc?.userId,
        userDoc?.uid,
        userDoc?.id,
        userDoc?._id,
      ].filter(Boolean);

      if (activeTab === "connections") {
        if (connections.length === 0) {
          setProducts([]);
          setLoading(false);
          return;
        }

        fetchedProducts = fetchedProducts.filter((p) => {
          const owner =
            p.userId ||
            p.ownerId ||
            p.postedBy ||
            p.createdBy;

          if (!owner) return false;

          // MUST be in connections
          const isFriend = connections.includes(owner);

          // MUST NOT be me
          const isMe = possibleUserIds.includes(owner);

          return isFriend && !isMe;
        });
      }

      setProducts(fetchedProducts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTab, userDoc]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View className="px-5 pt-2 pb-2 bg-white border-b border-gray-100" style={{ height: 110 }}>
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-2xl font-black text-gray-900">
            Market<Text className="text-indigo-600">Feed</Text>
          </Text>
          <TouchableOpacity className="bg-gray-100 p-2 rounded-full">
            <Ionicons name="search" size={20} color="black" />
          </TouchableOpacity>
        </View>

        <View className="flex-row bg-gray-100 p-1 rounded-xl">
          <TouchableOpacity
            onPress={() => setActiveTab("explore")}
            className={`flex-1 py-1.5 items-center rounded-lg ${
              activeTab === "explore" ? "bg-white" : ""
            }`}
          >
            <Text className={`font-bold text-sm ${activeTab === "explore" ? "text-gray-900" : "text-gray-500"}`}>
              Explore
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("connections")}
            className={`flex-1 py-1.5 items-center rounded-lg ${
              activeTab === "connections" ? "bg-white" : ""
            }`}
          >
            <Text className={`font-bold text-sm ${activeTab === "connections" ? "text-gray-900" : "text-gray-500"}`}>
              My Circle
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : activeTab === "connections" && (!userDoc?.connections || userDoc.connections.length === 0) ? (
        <View className="flex-1 justify-center items-center px-10">
          <Ionicons name="people-outline" size={60} color="#E5E7EB" />
          <Text className="text-gray-400 font-bold text-lg mt-4">No Connections Yet</Text>
          <Text className="text-gray-400 text-sm mt-1 text-center">
            Connect with dealers to see their listings here
          </Text>
        </View>
      ) : products.length === 0 ? (
        <View className="flex-1 justify-center items-center px-10">
          <Ionicons name="images-outline" size={60} color="#E5E7EB" />
          <Text className="text-gray-400 font-bold text-lg mt-4">
            No Listings From Your Circle
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          pagingEnabled
          decelerationRate="fast"
          snapToInterval={REEL_HEIGHT}
          renderItem={({ item }) => <ProductCard item={item as any} height={REEL_HEIGHT} />}
        />
      )}
    </SafeAreaView>
  );
}
