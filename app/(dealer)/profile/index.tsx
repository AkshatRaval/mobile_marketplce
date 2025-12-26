import { auth, db } from "@/FirebaseConfig";
import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// --- CONSTANTS ---
const { width: SCREEN_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get("window");
const GRID_ITEM_WIDTH = SCREEN_WIDTH / 3;

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_NAME;
const CLOUDINARY_API_KEY = process.env.EXPO_CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.EXPO_CLOUDINARY_API_SECRET;

// --- HELPER: GET IMAGE SAFELY ---
const getMainImage = (item: any) => {
  if (item.images && item.images.length > 0) return item.images[0];
  if (item.image) return item.image;
  return null;
};

// --- FEED CARD (Reels View) ---
const FeedProductCard: React.FC<{
  item: any;
  height: number;
  onClose: () => void;
  onLongPress: () => void;
}> = ({ item, height, onClose, onLongPress }) => {
  const [activeImageUri, setActiveImageUri] = useState(getMainImage(item));
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      style={{ height: height, width: SCREEN_WIDTH }}
      className="bg-black relative"
    >
      <Pressable onLongPress={onLongPress} className="flex-1 relative">
        {/* Main Image */}
        {activeImageUri ? (
          <Image
            source={{ uri: activeImageUri }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full bg-gray-900 items-center justify-center">
            <Ionicons name="image-outline" size={64} color="#333" />
          </View>
        )}

        {/* Back Button */}
        <View className="absolute top-12 left-4 z-50">
          <TouchableOpacity
            onPress={onClose}
            className="bg-black/40 p-2 rounded-full backdrop-blur-md"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Gradient */}
        <LinearGradient
          colors={[
            "transparent",
            "rgba(0,0,0,0.3)",
            "rgba(0,0,0,0.6)",
            "rgba(0,0,0,0.9)",
          ]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "50%",
          }}
        />

        {/* Thumbnails */}
        {item.images?.length > 1 && (
          <View className="absolute bottom-[160px] w-full pl-5">
            <FlatList
              data={item.images}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item: imgUrl }) => (
                <Pressable
                  onPress={() => setActiveImageUri(imgUrl)}
                  className={`mr-3 rounded-lg overflow-hidden border-2 shadow-sm ${activeImageUri === imgUrl ? "border-white" : "border-white/30"}`}
                >
                  <Image
                    source={{ uri: imgUrl }}
                    style={{ width: 40, height: 56 }}
                    className="bg-gray-800"
                  />
                </Pressable>
              )}
              keyExtractor={(_, i) => i.toString()}
            />
          </View>
        )}

        {/* Info */}
        <View className="absolute bottom-0 w-full px-5 pb-10">
          <View className="flex-row items-end justify-between mb-2">
            <View className="flex-1 mr-4">
              <Text className="text-white font-black text-3xl mb-1 shadow-sm leading-tight">
                {item.name}
              </Text>
              <Text className="text-yellow-400 font-bold text-2xl shadow-sm">
                ₹{item.price}
              </Text>
            </View>
            <View className="bg-white/20 p-2 rounded-full backdrop-blur-md">
              <Ionicons name="ellipsis-horizontal" size={20} color="white" />
            </View>
          </View>
          <Pressable onPress={() => setExpanded(!expanded)}>
            <Text
              numberOfLines={expanded ? undefined : 2}
              className="text-gray-300 text-sm leading-5"
            >
              {item.description || "No description provided."}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
};

// --- MAIN SCREEN ---
export default function Profile() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [listings, setListings] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [connectionsUsers, setConnectionsUsers] = useState<any[]>([]);

  // State
  const [feedVisible, setFeedVisible] = useState(false);
  const [initialFeedIndex, setInitialFeedIndex] = useState(0);
  const [reelHeight, setReelHeight] = useState(WINDOW_HEIGHT);

  // Actions
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const [isPriceModalVisible, setIsPriceModalVisible] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. USER DATA
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfileData(data);
        setListings([...(data.listings || [])].reverse());
      }
    });
    return () => unsub();
  }, [user]);

  // 2. CONNECTIONS
  useEffect(() => {
    if (!profileData?.connections?.length) {
      setConnectionsUsers([]);
      return;
    }
    const ids = profileData.connections.slice(0, 10);
    const q = query(collection(db, "users"), where("uid", "in", ids));
    const unsub = onSnapshot(q, (snap) => {
      // Ensure we grab the ID correctly
      setConnectionsUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [profileData?.connections]);

  // --- ACTIONS ---

  // 🔥 FIXED NAVIGATION FUNCTION 🔥
  const goToConnection = (targetUid: string) => {
    console.log("Navigating to Profile:", targetUid); // Debug check
    if (targetUid) {
      // Use explicit path to avoid confusion
      router.push(`/(dealer)/profile/${targetUid}`);
    } else {
      console.warn("User ID is missing!");
    }
  };

  const openFeedAtIndex = (index: number) => {
    setInitialFeedIndex(index);
    setFeedVisible(true);
  };

  const deleteImageFromCloud = async (imageUrl: string) => {
    if (!imageUrl) return;
    try {
      const split = imageUrl.split("/upload/");
      if (split.length < 2) return;
      let path = split[1].replace(/^v\d+\//, "");
      const publicId = path.split(".")[0];
      const timestamp = Math.round(new Date().getTime() / 1000);
      const signature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA1,
        `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`
      );
      await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_id: publicId,
            api_key: CLOUDINARY_API_KEY,
            timestamp,
            signature,
          }),
        }
      );
    } catch (e) {
      console.log("Cloudinary Delete Error", e);
    }
  };

  const handleDeleteListing = async () => {
    if (!selectedItem || !user?.uid) return;
    setLoading(true);
    try {
      const productRef = doc(db, "products", selectedItem.id);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        const data = productSnap.data();
        if (data.images)
          await Promise.all(data.images.map(deleteImageFromCloud));
      }

      await deleteDoc(productRef);
      const updatedList = profileData.listings.filter(
        (l: any) => l.id !== selectedItem.id
      );
      await updateDoc(doc(db, "users", user.uid), { listings: updatedList });
      setIsOptionsVisible(false);
    } catch (e) {
      Alert.alert("Error", "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrice = async () => {
    if (!selectedItem || !user?.uid) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "products", selectedItem.id), {
        price: newPrice,
      });
      const updatedList = profileData.listings.map((l: any) =>
        l.id === selectedItem.id ? { ...l, price: newPrice } : l
      );
      await updateDoc(doc(db, "users", user.uid), { listings: updatedList });
      setIsPriceModalVisible(false);
      setIsOptionsVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Exit?", [
      { text: "Cancel" },
      {
        text: "Log Out",
        onPress: () => {
          auth.signOut();
          router.replace("/");
        },
      },
    ]);
  };

  // --- HEADER ---
  const ListHeader = () => (
    <View className="bg-white pb-4 border-b border-gray-100 mb-0.5">
      <View className="flex-row justify-between items-center px-6 pt-2 mb-6">
        <Text className="text-gray-400 font-bold text-xs uppercase tracking-widest">
          MY PROFILE
        </Text>

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => router.push("/(dealer)/services/wishlist")}
            className="bg-gray-50 p-2 rounded-full"
          >
            <Ionicons name="heart-outline" size={20} color="black" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            className="bg-gray-50 p-2 rounded-full"
          >
            <Ionicons name="ellipsis-vertical" size={20} color="black" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-6 flex-row items-center mb-6">
        <Image
          source={{
            uri:
              profileData?.photoURL ||
              `https://ui-avatars.com/api/?name=${profileData?.displayName}`,
          }}
          className="w-20 h-20 rounded-full border-4 border-gray-50 mr-5"
        />
        <View>
          <Text className="text-2xl font-black text-gray-900">
            {profileData?.displayName || "Dealer"}
          </Text>
          <Text className="text-indigo-600 font-bold text-sm">
            {profileData?.shopName || "Verified Shop"}
          </Text>
          <View className="flex-row items-center mt-4 gap-5">
            {/* 1. LISTINGS (Static) */}
            <View>
              <Text className="text-lg font-black text-gray-900 leading-tight">
                {listings.length}
              </Text>
              <Text className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                Listings
              </Text>
            </View>

            {/* Divider Line */}
            <View className="w-[1px] h-6 bg-gray-200" />

            {/* 2. CIRCLE (Clickable & Colored) */}
            <TouchableOpacity
              onPress={() => router.push("/(dealer)/services/connections")}
              className="flex-row items-center"
            >
              <View>
                <Text className="text-lg font-black text-indigo-600 leading-tight">
                  {profileData?.connections?.length || 0}
                </Text>
                <Text className="text-[9px] font-bold text-gray-900 uppercase tracking-widest">
                  Circle
                </Text>
              </View>

              {/* Subtle Arrow Icon to indicate clickable */}
              <View className="ml-2 bg-gray-50 p-1 rounded-full">
                <Ionicons name="chevron-forward" size={12} color="black" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {connectionsUsers.length > 0 && (
        <View className="pl-6 mb-2">
          <Text className="text-gray-900 font-bold text-sm mb-3">
            My Connections
          </Text>
          <FlatList
            data={connectionsUsers}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => (
              // 🔥 UPDATED ONPRESS 🔥
              <TouchableOpacity
                onPress={() => goToConnection(item.uid || item.id)}
                className="mr-4 items-center"
              >
                <Image
                  source={{
                    uri:
                      item.photoURL ||
                      `https://ui-avatars.com/api/?name=${item.displayName}`,
                  }}
                  className="w-14 h-14 rounded-full border border-gray-200"
                />
                <Text
                  numberOfLines={1}
                  className="text-[10px] text-gray-500 mt-1 w-14 text-center"
                >
                  {item.displayName}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "white", paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />

      {/* --- GRID VIEW --- */}
      {listings.length === 0 ? (
        <>
          <ListHeader />
          <View className="flex-1 justify-center items-center opacity-50">
            <Ionicons name="cube-outline" size={64} color="gray" />
            <Text className="text-gray-400 font-bold mt-4">
              No Active Listings
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/upload-post")}
              className="mt-6 bg-black px-6 py-3 rounded-full"
            >
              <Text className="text-white font-bold">Create First Listing</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeader}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const imgSource = getMainImage(item);
            return (
              <TouchableOpacity
                onPress={() => openFeedAtIndex(index)}
                style={{ width: GRID_ITEM_WIDTH, height: GRID_ITEM_WIDTH }}
                className="border-[0.5px] border-white relative"
              >
                {imgSource ? (
                  <Image
                    source={{ uri: imgSource }}
                    className="w-full h-full bg-gray-200"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-full h-full bg-gray-100 items-center justify-center">
                    <Ionicons name="image-outline" size={24} color="#ccc" />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* --- FEED MODAL --- */}
      <Modal
        visible={feedVisible}
        animationType="slide"
        onRequestClose={() => setFeedVisible(false)}
      >
        <View
          className="flex-1 bg-black"
          onLayout={(e) => setReelHeight(e.nativeEvent.layout.height)}
        >
          <StatusBar barStyle="light-content" backgroundColor="black" />
          <FlatList
            data={listings}
            keyExtractor={(item) => item.id}
            pagingEnabled={true}
            snapToInterval={reelHeight}
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            initialScrollIndex={initialFeedIndex}
            getItemLayout={(data, index) => ({
              length: reelHeight,
              offset: reelHeight * index,
              index,
            })}
            renderItem={({ item }) => (
              <FeedProductCard
                item={item}
                height={reelHeight}
                onClose={() => setFeedVisible(false)}
                onLongPress={() => {
                  setSelectedItem(item);
                  setNewPrice(item.price);
                  setIsOptionsVisible(true);
                }}
              />
            )}
          />
        </View>
      </Modal>

      {/* --- OPTIONS MODAL --- */}
      <Modal visible={isOptionsVisible} transparent animationType="slide">
        <Pressable
          onPress={() => setIsOptionsVisible(false)}
          className="flex-1 bg-black/60 justify-end"
        >
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <View className="flex-row justify-center mb-6">
              <View className="w-12 h-1 bg-gray-300 rounded-full" />
            </View>
            <Text className="text-xl font-bold text-center mb-8">
              Manage Listing
            </Text>
            <TouchableOpacity
              onPress={() => {
                setIsOptionsVisible(false);
                setIsPriceModalVisible(true);
              }}
              className="bg-gray-100 p-4 rounded-xl flex-row items-center mb-3"
            >
              <Ionicons name="pricetag-outline" size={24} color="black" />
              <Text className="font-bold ml-4 text-base">Update Price</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeleteListing}
              disabled={loading}
              className="bg-red-50 p-4 rounded-xl flex-row items-center"
            >
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
              <Text className="font-bold ml-4 text-base text-red-500">
                Delete Listing
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsOptionsVisible(false)}
              className="mt-6"
            >
              <Text className="text-center font-bold text-gray-400">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* --- PRICE MODAL --- */}
      <Modal visible={isPriceModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/80 justify-center items-center px-6">
          <View className="bg-white w-full rounded-3xl p-6">
            <Text className="text-lg font-bold mb-4">New Price</Text>
            <TextInput
              value={newPrice}
              onChangeText={setNewPrice}
              keyboardType="numeric"
              className="bg-gray-100 p-4 rounded-xl text-xl font-black mb-6"
              placeholder="0"
            />
            <View className="flex-row gap-4">
              <TouchableOpacity
                onPress={() => setIsPriceModalVisible(false)}
                className="flex-1 bg-gray-200 py-3 rounded-xl items-center"
              >
                <Text className="font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdatePrice}
                disabled={loading}
                className="flex-1 bg-black py-3 rounded-xl items-center"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold">Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
