import { db } from "@/FirebaseConfig";
import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  documentId,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Linking,
  LogBox // 👈 Import LogBox
  ,
  Modal,
  Pressable,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  ViewToken
} from "react-native";
import ImageView from "react-native-image-viewing";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// ✅ FIX: Place this OUTSIDE the component to suppress the warning globally for this file
LogBox.ignoreLogs([
  "[Reanimated] Reading from `value`",
  "Reading from `value` during component render",
]);

/* ===============================
   TYPES & HELPERS
================================ */
interface Product {
  id: string;
  userId?: string;
  dealerId?: string;
  ownerId?: string;
  postedBy?: string;
  createdBy?: string;
  name: string;
  price: string;
  images: string[];
  image?: string; // ✅ Added optional property to fix TS error
  description: string;
  dealerName: string;
  dealerAvatar?: string;
  dealerPhone?: string;
  city: string;
  createdAt: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 16; 

const getCreatorId = (item: any) => {
  return item?.userId || item?.dealerId || item?.ownerId || item?.postedBy || item?.createdBy || null;
};

/* ===============================
   PRODUCT CARD
================================ */
const ProductCard = React.memo(({ 
  item, 
  height, 
  onPressProfile, 
  onPressImage 
}: { 
  item: Product; 
  height: number; 
  onPressProfile: (uid: string) => void;
  onPressImage: (images: string[], index: number) => void;
}) => {
  
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  
  // Safe image handling
  const images = (item.images && item.images.length > 0) ? item.images : (item.image ? [item.image] : []);

  const openWhatsApp = () => {
    if (!item.dealerPhone) return;
    const msg = `Hi, I'm interested in ${item.name} for ₹${item.price}`;
    Linking.openURL(
      `whatsapp://send?phone=${item.dealerPhone}&text=${encodeURIComponent(msg)}`
    ).catch(() => alert("WhatsApp not installed"));
  };

  return (
    <View style={{ height, width: SCREEN_WIDTH }} className="bg-white">
      <View className="flex-1 m-2 rounded-[28px] overflow-hidden bg-black relative">
        
        {/* HORIZONTAL IMAGE SCROLL */}
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          keyExtractor={(img, index) => `${item.id}-${index}`}
          renderItem={({ item: imgUri, index }) => (
             <Pressable 
                onPress={() => onPressImage(images, index)} 
                style={{ width: CARD_WIDTH, height: '100%' }}
             >
                <Image 
                  source={{ uri: imgUri }} 
                  style={{ width: '100%', height: '100%' }} 
                  resizeMode="cover" 
                />
             </Pressable>
          )}
        />

        {/* GRADIENT OVERLAY */}
        <LinearGradient
            pointerEvents="none" 
            colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)"]}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "55%" }}
        />

        {/* PROFILE BADGE (Top Left) */}
        <TouchableOpacity
          onPress={() => onPressProfile(getCreatorId(item))}
          className="absolute top-4 left-4 flex-row items-center bg-black/40 px-3 py-2 rounded-full backdrop-blur-md"
        >
          <Image
            source={{ uri: item.dealerAvatar || `https://ui-avatars.com/api/?name=${item.dealerName || "User"}` }}
            className="w-8 h-8 rounded-full border border-white/40"
          />
          <View className="ml-2">
            <Text className="text-white text-xs font-bold shadow-sm">{item.dealerName}</Text>
            <Text className="text-gray-300 text-[10px] shadow-sm">{item.city}</Text>
          </View>
        </TouchableOpacity>

        {/* BOTTOM CONTENT AREA */}
        <View className="absolute bottom-0 w-full px-5 pb-6">
          
          {/* ✅ PAGINATION DOTS (Centered, Above Title) */}
          {images.length > 1 && (
            <View className="self-center flex-row gap-1.5 mb-3 bg-black/20 px-2 py-1 rounded-full backdrop-blur-sm">
                {images.map((_, i) => (
                    <View
                        key={i}
                        className={`rounded-full transition-all duration-300 ${
                            i === activeIndex 
                            ? "bg-white w-2 h-2" 
                            : "bg-white/50 w-1.5 h-1.5"
                        }`}
                    />
                ))}
            </View>
          )}

          {/* Title & Price Row */}
          <View className="flex-row justify-between items-end mb-3">
            <View className="flex-1 mr-3">
              <Text className="text-white font-black text-3xl shadow-sm">{item.name}</Text>
              <Text className="text-yellow-400 font-bold text-2xl mt-1 shadow-sm">₹{item.price}</Text>
            </View>
            <TouchableOpacity onPress={openWhatsApp} className="bg-white h-12 w-12 rounded-full items-center justify-center shadow-lg">
              <Ionicons name="chatbubble" size={20} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Pressable onPress={() => setExpanded(!expanded)}>
            <Text numberOfLines={expanded ? undefined : 2} className="text-gray-300 text-sm leading-5">
              {item.description || "Mint condition. DM for details."}
            </Text>
            {(item.description?.length || 0) > 60 && (
              <Text className="text-gray-400 text-xs mt-1 font-bold">{expanded ? "Show less" : "...more"}</Text>
            )}
          </Pressable>
        </View>

      </View>
    </View>
  );
});

/* ===============================
   MAIN SCREEN
================================ */
export default function DealerHome() {
  const { user, userDoc } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter(); 
  
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(true);
  
  // Notifications
  const [isNotifVisible, setIsNotifVisible] = useState(false);
  const [requestUsers, setRequestUsers] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Global Image Viewer
  const [viewerData, setViewerData] = useState({
    visible: false,
    images: [] as {uri: string}[],
    index: 0
  });

  const HEADER_HEIGHT = 60;
  const TAB_BAR_HEIGHT = 56;
  const REEL_HEIGHT = Dimensions.get("window").height - HEADER_HEIGHT - TAB_BAR_HEIGHT - insets.top - insets.bottom;

  // 1. DATA FETCHING
  const fetchProducts = async () => {
    setRefreshing(true);
    try {
      const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const rawList = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setAllProducts(rawList);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // 2. FETCH REQUESTS
  useEffect(() => {
    const requestIds = userDoc?.requests || [];
    if (requestIds.length === 0) {
      setRequestUsers([]);
      return;
    }
    const safeIds = requestIds.slice(0, 10);
    const q = query(collection(db, "users"), where(documentId(), "in", safeIds));
    getDocs(q).then((snap) => {
       setRequestUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    });
  }, [userDoc?.requests]);

  // --- ACTIONS ---
  const handleProfilePress = useCallback((uid: string) => {
    if (!uid) return;
    router.push(`/(dealer)/profile/${uid}`);
  }, [router]);

  const handleImagePress = useCallback((images: string[], index: number) => {
    setViewerData({ visible: true, images: images.map(uri => ({ uri })), index });
  }, []);

  const handleAccept = async (targetUid: string) => {
    if (!user?.uid || !targetUid) return;
    setProcessingId(targetUid);
    try {
      const batch = writeBatch(db);
      const myRef = doc(db, "users", user.uid);
      const theirRef = doc(db, "users", targetUid);
      batch.update(myRef, { connections: arrayUnion(targetUid), requests: arrayRemove(targetUid) });
      batch.update(theirRef, { connections: arrayUnion(user.uid) });
      await batch.commit();
    } catch (e) { alert("Error"); } finally { setProcessingId(null); }
  };

  const handleReject = async (targetUid: string) => {
    if (!user?.uid) return;
    setProcessingId(targetUid);
    try {
      await updateDoc(doc(db, "users", user.uid), { requests: arrayRemove(targetUid) });
    } catch (e) { alert("Error"); } finally { setProcessingId(null); }
  };

  const renderProductItem = useCallback(({ item }: { item: Product }) => (
    <ProductCard 
      item={item} 
      height={REEL_HEIGHT} 
      onPressProfile={handleProfilePress} 
      onPressImage={handleImagePress} 
    />
  ), [REEL_HEIGHT, handleProfilePress, handleImagePress]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View className="px-4 bg-white border-b border-gray-100 flex-row items-center justify-between" style={{ height: HEADER_HEIGHT }}>
        <Text className="text-xl font-black text-black italic">FEED</Text>

        <TouchableOpacity onPress={() => setIsNotifVisible(true)} className="bg-gray-100 h-10 w-10 rounded-full items-center justify-center relative">
          <Ionicons name="notifications-outline" size={22} color="black" />
          {(userDoc?.requests?.length || 0) > 0 && (
            <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
          )}
        </TouchableOpacity>
      </View>

      {/* FEED */}
      {allProducts.length === 0 && !refreshing ? (
        <View className="flex-1 justify-center items-center opacity-50 px-10">
          <Ionicons name="cube-outline" size={64} color="gray" />
          <Text className="font-bold mt-4 text-center text-gray-500">No listings found.</Text>
          <TouchableOpacity onPress={fetchProducts} className="mt-4 bg-gray-200 px-4 py-2 rounded-full">
            <Text className="text-xs font-bold">Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={allProducts}
          keyExtractor={(item) => item.id}
          pagingEnabled
          snapToInterval={REEL_HEIGHT}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom }}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={3}
          renderItem={renderProductItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchProducts} />}
        />
      )}

      {/* GLOBAL IMAGE VIEWER */}
      <ImageView
        images={viewerData.images}
        imageIndex={viewerData.index}
        visible={viewerData.visible}
        onRequestClose={() => setViewerData(prev => ({ ...prev, visible: false }))}
      />

      {/* NOTIFICATIONS MODAL */}
      <Modal visible={isNotifVisible} animationType="slide" transparent={true} onRequestClose={() => setIsNotifVisible(false)}>
        <Pressable onPress={() => setIsNotifVisible(false)} className="flex-1 bg-black/50 justify-end">
           <Pressable className="bg-white rounded-t-3xl h-[60%] overflow-hidden">
              <View className="flex-row justify-between items-center p-6 border-b border-gray-100">
                  <Text className="text-xl font-black text-gray-900">Notifications</Text>
                  <TouchableOpacity onPress={() => setIsNotifVisible(false)} className="bg-gray-100 p-2 rounded-full"><Ionicons name="close" size={20} color="black" /></TouchableOpacity>
              </View>
              {requestUsers.length === 0 ? (
                  <View className="flex-1 justify-center items-center opacity-40">
                      <Ionicons name="notifications-off-outline" size={48} color="gray" />
                      <Text className="mt-4 font-bold text-gray-500">No new requests</Text>
                  </View>
              ) : (
                  <FlatList 
                    data={requestUsers}
                    keyExtractor={item => item.uid}
                    contentContainerStyle={{ padding: 24 }}
                    renderItem={({ item }) => (
                        <View className="flex-row items-center mb-6">
                            <Image source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${item.displayName}` }} className="w-12 h-12 rounded-full border border-gray-100" />
                            <View className="flex-1 ml-3">
                                <Text className="font-bold text-base text-gray-900">{item.displayName}</Text>
                                <Text className="text-xs text-gray-500">wants to join your circle</Text>
                            </View>
                            <View className="flex-row gap-2">
                                <TouchableOpacity disabled={processingId === item.uid} onPress={() => handleReject(item.uid)} className="bg-gray-100 px-4 py-2 rounded-lg"><Text className="font-bold text-gray-600 text-xs">Delete</Text></TouchableOpacity>
                                <TouchableOpacity disabled={processingId === item.uid} onPress={() => handleAccept(item.uid)} className="bg-black px-4 py-2 rounded-lg flex-row items-center">
                                    {processingId === item.uid && <ActivityIndicator size="small" color="white" className="mr-2" />}
                                    <Text className="font-bold text-white text-xs">Confirm</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                  />
              )}
           </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}