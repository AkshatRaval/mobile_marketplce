import { auth, db } from "@/FirebaseConfig"; // Make sure auth is imported
import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
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
    Linking,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = width / 2 - 24; 

export default function PublicDealerProfile() {
  const { id } = useLocalSearchParams();
  const {user} = useAuth()
  const router = useRouter();
  useEffect(() => {
    if(id === user?.uid){
        router.replace('/profile')
    }
  },[id])

  const [dealerData, setDealerData] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCircle, setAddingToCircle] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      console.log(id);
      try {
        if (!id) return;
        const dealerId = Array.isArray(id) ? id[0] : id; // Safety check

        // 1. Fetch Dealer Profile
        const userSnap = await getDoc(doc(db, "users", dealerId));
        if (userSnap.exists()) {
          setDealerData(userSnap.data());
        }

        // 2. Fetch Dealer's Inventory (Products)
        const q = query(
          collection(db, "products"),
          where("userId", "==", dealerId)
        );
        const productsSnap = await getDocs(q);
        const products = productsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setInventory(products);
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // --- ACTIONS ---

  const openWhatsApp = () => {
    if (!dealerData?.phoneNumber) {
      Alert.alert("No Info", "This dealer hasn't provided a phone number.");
      return;
    }
    const url = `whatsapp://send?phone=${dealerData.phoneNumber}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Could not open WhatsApp")
    );
  };

  const handleAddToCircle = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setAddingToCircle(true);
    try {
      const myUserRef = doc(db, "users", currentUser.uid);
      // Add this dealer's ID to my 'connections' array
      await updateDoc(myUserRef, {
        connections: arrayUnion(id),
      });
      Alert.alert("Success", "Added to your Circle!");
    } catch (error) {
      Alert.alert("Error", "Could not add connection.");
    } finally {
      setAddingToCircle(false);
    }
  };

  // --- RENDERERS ---

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!dealerData) {
    return (
      <View className="flex-1 justify-center items-center bg-white px-6">
        <Text className="text-gray-500 mb-4">Dealer profile not found.</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-black px-6 py-3 rounded-full"
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View className="px-4 py-2 flex-row items-center border-b border-gray-100 bg-white z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2 rounded-full active:bg-gray-100"
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="font-bold text-lg ml-2">
          {dealerData.shopName || "Dealer Profile"}
        </Text>
      </View>

      <FlatList
        data={inventory}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        // --- DEALER INFO HEADER ---
        ListHeaderComponent={() => (
          <View className="items-center mb-8">
            {/* Avatar */}
            <Image
              source={{
                uri:
                  dealerData.photoURL ||
                  `https://ui-avatars.com/api/?name=${dealerData.displayName}&background=random`,
              }}
              className="w-24 h-24 rounded-full border-4 border-gray-50 mb-3"
            />
            <Text className="text-2xl font-black text-gray-900 text-center">
              {dealerData.displayName}
            </Text>
            <View className="flex-row items-center mt-1">
              <Ionicons name="location" size={14} color="#6B7280" />
              <Text className="text-gray-500 text-sm ml-1">
                {dealerData.city || "Online Dealer"}
              </Text>
            </View>

            {/* Stats Grid */}
            <View className="flex-row mt-6 w-full justify-center gap-8 border-y border-gray-100 py-4">
              <View className="items-center">
                <Text className="font-bold text-lg">{inventory.length}</Text>
                <Text className="text-xs text-gray-400 uppercase tracking-wide">
                  Phones
                </Text>
              </View>
              <View className="w-[1px] bg-gray-200" />
              <View className="items-center">
                <Text className="font-bold text-lg">4.9</Text>
                <Text className="text-xs text-gray-400 uppercase tracking-wide">
                  Rating
                </Text>
              </View>
              <View className="w-[1px] bg-gray-200" />
              <View className="items-center">
                <Text className="font-bold text-lg text-green-600">Active</Text>
                <Text className="text-xs text-gray-400 uppercase tracking-wide">
                  Status
                </Text>
              </View>
            </View>

            {/* Buttons */}
            <View className="flex-row gap-3 mt-6 w-full">
              <TouchableOpacity
                onPress={openWhatsApp}
                className="flex-1 bg-[#25D366] py-3.5 rounded-xl flex-row justify-center items-center shadow-sm"
              >
                <Ionicons
                  name="logo-whatsapp"
                  size={20}
                  color="white"
                  style={{ marginRight: 8 }}
                />
                <Text className="text-white font-bold">WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAddToCircle}
                disabled={addingToCircle}
                className="flex-1 bg-gray-900 py-3.5 rounded-xl flex-row justify-center items-center shadow-sm"
              >
                {addingToCircle ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons
                      name="people"
                      size={20}
                      color="white"
                      style={{ marginRight: 8 }}
                    />
                    <Text className="text-white font-bold">Add to Circle</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <Text className="self-start mt-8 text-lg font-bold text-gray-900">
              Available Stock
            </Text>
          </View>
        )}
        // --- EMPTY STATE ---
        ListEmptyComponent={() => (
          <View className="py-10 items-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <Text className="text-gray-400">No phones listed currently.</Text>
          </View>
        )}
        // --- PRODUCT CARD (Grid Item) ---
        renderItem={({ item }) => (
          <View
            style={{ width: COLUMN_WIDTH }}
            className="bg-white rounded-2xl mb-4 border border-gray-100 overflow-hidden shadow-sm"
          >
            <Image
              source={{ uri: item.images?.[0] }}
              style={{ width: "100%", height: COLUMN_WIDTH }}
              className="bg-gray-100"
              resizeMode="cover"
            />
            <View className="p-3">
              <Text
                numberOfLines={1}
                className="font-bold text-gray-900 text-sm mb-1"
              >
                {item.name}
              </Text>
              <Text className="font-black text-indigo-600">₹{item.price}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
