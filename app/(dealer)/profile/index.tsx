import { auth, db } from "@/FirebaseConfig";
import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { useRouter } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  StatusBar,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const CARD_GAP = 12;
const CARD_WIDTH = (width - 48 - CARD_GAP) / 2;

const CLOUD_NAME = "dx90g9xvc";
const CLOUDINARY_API_KEY = "842713721318274";
const CLOUDINARY_API_SECRET = "eLGko5UuOYXeSHnRQPU_hIJw1ZU";

export default function Profile() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [listings, setListings] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>(null);

  const [connectionsUsers, setConnectionsUsers] = useState<any[]>([]);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isPriceModalVisible, setIsPriceModalVisible] = useState(false);
  const [isActionSheetVisible, setIsActionSheetVisible] = useState(false);

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [newPrice, setNewPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    displayName: "",
    shopName: "",
    about: "",
    address: "",
  });

  // ---------- USER REALTIME LISTENER ----------
  useEffect(() => {
    if (!user?.uid) return;

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfileData(data);

        if (data.listings && Array.isArray(data.listings)) {
          setListings([...data.listings].reverse());
        } else {
          setListings([]);
        }

        setFormData({
          displayName: data.displayName || "",
          shopName: data.shopName || "",
          about: data.about || "",
          address: data.address || "",
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  // ---------- CONNECTIONS LOADER ----------
  useEffect(() => {
    if (!profileData?.connections || profileData.connections.length === 0) {
      setConnectionsUsers([]);
      return;
    }

    const ids: string[] = profileData.connections;

    const chunkArray = (arr: any[], size: number) =>
      arr.reduce(
        (acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]),
        []
      );

    const chunks = chunkArray(ids, 10);
    let unsubscribers: any[] = [];

    const fetchConnections = async () => {
      let allUsers: any[] = [];

      for (const group of chunks) {
        const q = query(
          collection(db, "users"),
          where("uid", "in", group)
        );

        const unsub = onSnapshot(q, (snap) => {
          const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          allUsers = [...allUsers, ...users];
          setConnectionsUsers([...allUsers]);
        });

        unsubscribers.push(unsub);
      }
    };

    fetchConnections();
    return () => unsubscribers.forEach((u) => u && u());
  }, [profileData?.connections]);

  // ---------- CLOUDINARY DELETE ----------
  const deleteImageFromCloud = async (imageUrl: string) => {
    if (!imageUrl) return;
    try {
      const split = imageUrl.split("/upload/");
      if (split.length < 2) return;

      let path = split[1];
      path = path.replace(/^v\d+\//, "");

      const parts = path.split(".");
      parts.pop();
      const publicId = parts.join(".");

      const timestamp = Math.round(new Date().getTime() / 1000);
      const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
      const signature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA1,
        stringToSign
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
    } catch {}
  };

  // ---------- DELETE LISTING ----------
  const handleDelete = async () => {
    if (!user?.uid || !selectedItem) return;
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "products", selectedItem.id));
      if (snap.exists()) {
        const product = snap.data();
        if (product.images) {
          await Promise.all(product.images.map(deleteImageFromCloud));
        }
      }

      await deleteDoc(doc(db, "products", selectedItem.id));

      const updated = profileData.listings.filter(
        (l: any) => l.id !== selectedItem.id
      );

      await updateDoc(doc(db, "users", user.uid), {
        listings: updated,
      });

      setIsActionSheetVisible(false);
      Alert.alert("Deleted", "Listing removed.");
    } catch {
      Alert.alert("Error", "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSold = async () => {
    if (!user?.uid || !selectedItem) return;
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "products", selectedItem.id));

      if (snap.exists()) {
        const product = snap.data();
        if (product.images) {
          await Promise.all(product.images.map(deleteImageFromCloud));
        }
      }

      await deleteDoc(doc(db, "products", selectedItem.id));

      const updated = profileData.listings.filter(
        (l: any) => l.id !== selectedItem.id
      );

      await updateDoc(doc(db, "users", user.uid), {
        soldCount: increment(1),
        listings: updated,
      });

      setIsActionSheetVisible(false);
    } catch {
      Alert.alert("Error", "Could not mark sold");
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

      const updated = profileData.listings.map((l: any) =>
        l.id === selectedItem.id ? { ...l, price: newPrice } : l
      );

      await updateDoc(doc(db, "users", user.uid), {
        listings: updated,
      });

      setIsPriceModalVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), formData);
      setIsEditingProfile(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Log Out?", "Exit app?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => {
          auth.signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  // ---------- UI ----------
  const renderHeader = () => (
    <View className="mb-6 px-6">

      <View className="flex-row justify-between items-center py-4">
        <Text className="text-3xl font-black text-gray-900">
          My Dealer<Text className="text-indigo-600">ID</Text>
        </Text>
        <TouchableOpacity onPress={handleLogout} className="bg-gray-100 p-2 rounded-full">
          <Ionicons name="log-out-outline" size={20} color="black" />
        </TouchableOpacity>
      </View>

      {/* ----- PROFILE CARD ----- */}
      <View className="bg-gray-900 rounded-3xl p-6">

        <View className="flex-row justify-between items-start mb-6">
          <View className="w-16 h-16 bg-white/10 rounded-2xl items-center justify-center border border-white/20">
            <Text className="text-2xl text-white font-bold">
              {formData.displayName?.charAt(0)?.toUpperCase()}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setIsEditingProfile(true)}
            className="bg-white/20 p-2 rounded-xl"
          >
            <Ionicons name="create-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <Text className="text-white text-2xl font-bold">
          {formData.shopName || "My Shop"}
        </Text>
        <Text className="text-gray-400">{formData.displayName}</Text>

      </View>

      {/* ----- STATS ----- */}
      <View className="flex-row mt-6 justify-between bg-white p-4 rounded-2xl shadow-sm border">

        <View className="items-center flex-1 border-r">
          <Text className="text-xs text-gray-500">Inventory</Text>
          <Text className="text-xl font-black">{listings.length}</Text>
        </View>

        <View className="items-center flex-1 border-r">
          <Text className="text-xs text-gray-500">Connections</Text>
          <Text className="text-xl font-black">
            {profileData?.connections?.length || 0}
          </Text>
        </View>

        <View className="items-center flex-1">
          <Text className="text-xs text-gray-500">Sold</Text>
          <Text className="text-xl font-black">
            {profileData?.soldCount || 0}
          </Text>
        </View>

      </View>

      {/* ----- CONNECTIONS LIST ----- */}
      {connectionsUsers.length > 0 && (
        <View className="mt-6">
          <Text className="text-lg font-bold text-gray-900 mb-3">
            My Circle
          </Text>

          <FlatList
            data={connectionsUsers}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(i) => i.uid}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => router.push(`/profile/${item.uid}`)}
                className="items-center mr-5"
              >
                <Image
                  source={{
                    uri:
                      item.dealerAvatar ||
                      `https://ui-avatars.com/api/?name=${item.displayName || "User"}`,
                  }}
                  className="w-16 h-16 rounded-full border-2 border-indigo-500"
                />
                <Text numberOfLines={1} className="text-xs mt-1 font-semibold w-16 text-center">
                  {item.shopName || item.displayName || "Dealer"}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View className="flex-row items-center justify-between mt-8 mb-2">
        <Text className="text-lg font-bold">Current Stock</Text>
        <TouchableOpacity onPress={() => router.push("/")}>
          <Text className="text-indigo-600 font-bold">Add Item +</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProductCard = ({ item }: any) => {
    const imageUrl = item.image || item.images?.[0];
    return (
      <TouchableOpacity
        onLongPress={() => {
          setSelectedItem(item);
          setIsActionSheetVisible(true);
        }}
        className="bg-white rounded-2xl mb-4 overflow-hidden"
        style={{ width: CARD_WIDTH }}
      >
        <View className="h-40 bg-gray-200">
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} className="w-full h-full" />
          ) : null}
        </View>

        <View className="p-3">
          <Text numberOfLines={1} className="font-bold">
            {item.name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />

      <FlatList
        data={listings}
        keyExtractor={(i, idx) => i.id || idx.toString()}
        ListHeaderComponent={renderHeader}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 24 }}
        renderItem={renderProductCard}
      />
    </View>
  );
}
