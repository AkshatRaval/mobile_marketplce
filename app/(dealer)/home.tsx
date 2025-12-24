import { db } from "@/FirebaseConfig";
import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  documentId,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  writeBatch
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ImageView from "react-native-image-viewing";
import { SafeAreaView } from "react-native-safe-area-context";

// --- TYPES ---
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

// --- PRODUCT CARD COMPONENT ---
const ProductCard: React.FC<{ item: Product; height: number }> = ({ item, height }) => {
  const router = useRouter();
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
        <Pressable onPress={openImageViewer} className="w-full h-full">
          <Image source={{ uri: activeImageUri }} className="w-full h-full" resizeMode="cover" />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.8)"]}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "40%" }}
          />
        </Pressable>

        <TouchableOpacity 
          onPress={goToProfile} 
          className="absolute top-4 left-4 flex-row items-center bg-black/40 px-3 py-2 rounded-full backdrop-blur-md"
        >
          <Image
            source={{ uri: item.dealerAvatar || `https://ui-avatars.com/api/?name=${item.dealerName}&background=random` }}
            className="w-8 h-8 rounded-full border border-white/50"
          />
          <View className="ml-2">
            <Text className="text-white font-bold text-xs shadow-black">{item.dealerName}</Text>
            <Text className="text-gray-200 text-[10px] shadow-black">{item.city}</Text>
          </View>
        </TouchableOpacity>

        <View className="absolute bottom-0 w-full px-5 pb-6">
          <View className="flex-row items-end justify-between mb-3">
             <View className="flex-1 mr-4">
                <Text className="text-white font-black text-3xl mb-1 shadow-sm leading-tight">{item.name}</Text>
                <Text className="text-yellow-400 font-bold text-2xl shadow-sm">₹{item.price}</Text>
             </View>
             <TouchableOpacity onPress={openWhatsApp} className="bg-white rounded-full h-12 w-12 items-center justify-center shadow-lg">
               <Ionicons name="chatbubble" size={20} color="black" />
             </TouchableOpacity>
          </View>
          <Pressable onPress={() => setExpanded(!expanded)}>
            <Text numberOfLines={expanded ? undefined : 2} className="text-gray-300 text-sm leading-5">
              {item.description || "Mint condition. DM for more details."}
            </Text>
            {(item.description?.length || 0) > 60 && (
               <Text className="text-gray-500 text-xs mt-1 font-bold">{expanded ? "Show Less" : "...more"}</Text>
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

// --- MAIN SCREEN ---
export default function DealerHome() {
  const { userDoc, user } = useAuth(); // Ensure user is available
  const [activeTab, setActiveTab] = useState<"explore" | "connections">("explore");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const REEL_HEIGHT = SCREEN_HEIGHT - 195;

  // --- NOTIFICATION STATE ---
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]); // Array of User Objects
  const [loadingRequests, setLoadingRequests] = useState(false);

  // 1. FETCH PRODUCTS
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedProducts: Product[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));

      const connections = userDoc?.connections || [];
      const authUid = getAuth().currentUser?.uid;

      if (activeTab === "connections") {
        if (connections.length === 0) {
          setProducts([]);
          setLoading(false);
          return;
        }

        fetchedProducts = fetchedProducts.filter((p) => {
          const owner = p.userId || p.ownerId || p.postedBy || p.createdBy;
          if (!owner) return false;
          const isFriend = connections.includes(owner);
          const isMe = owner === authUid;
          return isFriend && !isMe;
        });
      }

      setProducts(fetchedProducts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTab, userDoc]);

  // 2. LISTEN FOR PENDING REQUESTS
  useEffect(() => {
    if (!userDoc?.pendingRequests || userDoc.pendingRequests.length === 0) {
      setPendingRequests([]);
      return;
    }

    const fetchRequestProfiles = async () => {
      // Fetch details of users who sent requests
      // Firestore 'in' query supports up to 10 items. If more, you need to chunk.
      // For simple app, we assume < 10 pending requests at a time usually.
      try {
        setLoadingRequests(true);
        const q = query(
          collection(db, "users"),
          where(documentId(), "in", userDoc.pendingRequests.slice(0, 10))
        );
        const snap = await getDocs(q);
        const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPendingRequests(users);
      } catch (e) {
        console.error("Error fetching requests", e);
      } finally {
        setLoadingRequests(false);
      }
    };

    fetchRequestProfiles();
  }, [userDoc?.pendingRequests]);


  // 3. APPROVE / DECLINE LOGIC
  const handleResponse = async (requesterId: string, action: "approve" | "decline") => {
    if (!user?.uid) return;
    
    try {
      const batch = writeBatch(db);
      const myRef = doc(db, "users", user.uid);
      const theirRef = doc(db, "users", requesterId);

      if (action === "approve") {
        // 1. Add them to my connections
        batch.update(myRef, {
          connections: arrayUnion(requesterId),
          pendingRequests: arrayRemove(requesterId)
        });
        // 2. Add me to their connections (Mutual)
        batch.update(theirRef, {
          connections: arrayUnion(user.uid)
        });
      } else {
        // Just remove request
        batch.update(myRef, {
          pendingRequests: arrayRemove(requesterId)
        });
      }

      await batch.commit();
      
      // Optimistic UI Update
      setPendingRequests(prev => prev.filter(p => p.id !== requesterId));

    } catch (error) {
      console.error("Error handling request:", error);
      alert("Something went wrong");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* --- HEADER --- */}
      <View className="px-5 pt-2 pb-2 bg-white border-b border-gray-100" style={{ height: 110 }}>
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-2xl font-black text-gray-900">
            Market<Text className="text-indigo-600">Feed</Text>
          </Text>
          
          {/* NOTIFICATION ICON */}
          <TouchableOpacity 
            onPress={() => setShowNotifications(true)}
            className="bg-gray-100 p-2 rounded-full relative"
          >
            <Ionicons name="notifications-outline" size={22} color="black" />
            {/* Red Dot Badge */}
            {userDoc?.pendingRequests?.length > 0 && (
              <View className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row bg-gray-100 p-1 rounded-xl">
          <TouchableOpacity
            onPress={() => setActiveTab("explore")}
            className={`flex-1 py-1.5 items-center rounded-lg ${activeTab === "explore" ? "bg-white" : ""}`}
          >
            <Text className={`font-bold text-sm ${activeTab === "explore" ? "text-gray-900" : "text-gray-500"}`}>
              Explore
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("connections")}
            className={`flex-1 py-1.5 items-center rounded-lg ${activeTab === "connections" ? "bg-white" : ""}`}
          >
            <Text className={`font-bold text-sm ${activeTab === "connections" ? "text-gray-900" : "text-gray-500"}`}>
              My Circle
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- FEED --- */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : activeTab === "connections" && (!userDoc?.connections || userDoc.connections.length === 0) ? (
        <View className="flex-1 justify-center items-center px-10">
          <Ionicons name="people-outline" size={60} color="#E5E7EB" />
          <Text className="text-gray-400 font-bold text-lg mt-4">No Connections Yet</Text>
          <Text className="text-gray-400 text-sm mt-1 text-center">Connect with dealers to see listings</Text>
        </View>
      ) : products.length === 0 ? (
        <View className="flex-1 justify-center items-center px-10">
          <Ionicons name="images-outline" size={60} color="#E5E7EB" />
          <Text className="text-gray-400 font-bold text-lg mt-4">No Listings Found</Text>
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

      {/* --- NOTIFICATIONS MODAL --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showNotifications}
        onRequestClose={() => setShowNotifications(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl h-[70%] p-5">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-gray-900">
                Requests ({pendingRequests.length})
              </Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)} className="bg-gray-100 p-1 rounded-full">
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>

            {loadingRequests ? (
               <ActivityIndicator color="#4F46E5" />
            ) : pendingRequests.length === 0 ? (
               <View className="flex-1 justify-center items-center opacity-50">
                  <Ionicons name="checkmark-done-circle-outline" size={60} color="gray" />
                  <Text className="mt-4 text-gray-500 font-medium">All caught up!</Text>
               </View>
            ) : (
              <FlatList 
                data={pendingRequests}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View className="flex-row items-center justify-between mb-4 bg-gray-50 p-3 rounded-xl">
                    <View className="flex-row items-center flex-1">
                      <Image 
                        source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${item.displayName}` }} 
                        className="w-12 h-12 rounded-full bg-gray-200"
                      />
                      <View className="ml-3 flex-1">
                         <Text className="font-bold text-gray-900 text-base">{item.displayName}</Text>
                         <Text className="text-gray-500 text-xs">{item.shopName || "Dealer"}</Text>
                      </View>
                    </View>
                    
                    <View className="flex-row gap-2">
                       <TouchableOpacity 
                         onPress={() => handleResponse(item.id, "decline")}
                         className="bg-gray-200 p-2 rounded-full"
                       >
                          <Ionicons name="close" size={20} color="black" />
                       </TouchableOpacity>
                       <TouchableOpacity 
                         onPress={() => handleResponse(item.id, "approve")}
                         className="bg-indigo-600 p-2 rounded-full"
                       >
                          <Ionicons name="checkmark" size={20} color="white" />
                       </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}