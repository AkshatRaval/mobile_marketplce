import { auth, db } from "@/FirebaseConfig";
import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch
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

// --- DIMENSIONS ---
const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - 48) / 2; 

export default function PublicDealerProfile() {
  const { id } = useLocalSearchParams();
  const { user, userDoc } = useAuth(); // Get userDoc to check current status
  const router = useRouter();

  // Redirect if viewing own profile
  useEffect(() => {
    if (id === user?.uid) router.replace("/profile");
  }, [id]);

  const [dealerData, setDealerData] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestStatus, setRequestStatus] = useState<"none" | "pending" | "connected">("none");
  const [processing, setProcessing] = useState(false);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id) return;
        const dealerId = Array.isArray(id) ? id[0] : id;

        // 1. Dealer Profile
        const userSnap = await getDoc(doc(db, "users", dealerId));
        if (userSnap.exists()) setDealerData(userSnap.data());

        // 2. Inventory
        const q = query(collection(db, "products"), where("userId", "==", dealerId));
        const productsSnap = await getDocs(q);
        setInventory(productsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        
        // 3. Check Connection Status
        if (userDoc) {
          if (userDoc.connections?.includes(dealerId)) {
            setRequestStatus("connected");
          } else if (userDoc.outgoingRequests?.includes(dealerId)) {
            setRequestStatus("pending");
          } else {
            setRequestStatus("none");
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, userDoc]); // Re-run if userDoc updates

  // --- ACTIONS ---
  const openWhatsApp = () => {
    if (!dealerData?.phoneNumber) return Alert.alert("No Info", "Number not available.");
    Linking.openURL(`whatsapp://send?phone=${dealerData.phoneNumber}`).catch(() =>
      Alert.alert("Error", "Could not open WhatsApp")
    );
  };

  const handleConnect = async () => {
    if (!auth.currentUser || !id) return;
    const dealerId = Array.isArray(id) ? id[0] : id;
    
    setProcessing(true);
    try {
      const batch = writeBatch(db);
      const myRef = doc(db, "users", auth.currentUser.uid);
      const dealerRef = doc(db, "users", dealerId);

      if (requestStatus === "none") {
        // --- SEND REQUEST ---
        // 1. Add to MY 'outgoingRequests'
        batch.update(myRef, {
          outgoingRequests: arrayUnion(dealerId)
        });
        // 2. Add to THEIR 'pendingRequests' (This triggers their notification)
        batch.update(dealerRef, {
          pendingRequests: arrayUnion(auth.currentUser.uid)
        });
        
        await batch.commit();
        setRequestStatus("pending");
        Alert.alert("Request Sent", "Waiting for approval.");

      } else if (requestStatus === "pending") {
        // --- CANCEL REQUEST ---
        batch.update(myRef, {
          outgoingRequests: arrayRemove(dealerId)
        });
        batch.update(dealerRef, {
          pendingRequests: arrayRemove(auth.currentUser.uid)
        });

        await batch.commit();
        setRequestStatus("none");
        Alert.alert("Cancelled", "Request withdrawn.");
      }

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not update connection.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!dealerData) return null;

  // --- RENDER HEADER ---
  const renderHeader = () => (
    <View className="mb-6">
      {/* 1. COVER IMAGE */}
      <View className="h-40 w-full overflow-hidden">
        <LinearGradient
          colors={["#4F46E5", "#818CF8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="w-full h-full"
        />
        <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-xl" />
        <View className="absolute top-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-xl" />
      </View>

      {/* 2. PROFILE CARD */}
      <View className="mx-5 -mt-16 bg-white rounded-3xl p-5 shadow-lg shadow-indigo-100 border border-gray-50 items-center">
        <Image
          source={{
            uri: dealerData.photoURL || `https://ui-avatars.com/api/?name=${dealerData.displayName}&background=random&size=200`,
          }}
          className="w-24 h-24 rounded-full border-4 border-white -mt-16 mb-3 bg-gray-200"
        />

        <View className="flex-row items-center justify-center">
          <Text className="text-2xl font-black text-gray-900 text-center">
            {dealerData.shopName || dealerData.displayName}
          </Text>
          <Ionicons name="checkmark-circle" size={20} color="#4F46E5" style={{ marginLeft: 6 }} />
        </View>

        <Text className="text-gray-500 font-medium text-sm mt-1 mb-4">
          @{dealerData.displayName.replace(/\s/g, "").toLowerCase()} • {dealerData.city || "Global"}
        </Text>

        {/* Stats */}
        <View className="flex-row w-full justify-between px-6 py-4 bg-gray-50 rounded-2xl mb-5">
          <View className="items-center flex-1">
            <Text className="text-xl font-black text-gray-900">{inventory.length}</Text>
            <Text className="text-[10px] uppercase font-bold text-gray-400 mt-1">Items</Text>
          </View>
          <View className="w-[1px] bg-gray-200 h-full mx-2" />
          <View className="items-center flex-1">
            <Text className="text-xl font-black text-gray-900">4.9</Text>
            <Text className="text-[10px] uppercase font-bold text-gray-400 mt-1">Rating</Text>
          </View>
          <View className="w-[1px] bg-gray-200 h-full mx-2" />
          <View className="items-center flex-1">
            <Text className="text-xl font-black text-green-600">Open</Text>
            <Text className="text-[10px] uppercase font-bold text-gray-400 mt-1">Status</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3 w-full">
          <TouchableOpacity
            onPress={openWhatsApp}
            className="flex-1 bg-green-500 py-3.5 rounded-xl flex-row justify-center items-center shadow-sm active:opacity-90"
          >
            <Ionicons name="logo-whatsapp" size={18} color="white" style={{ marginRight: 6 }} />
            <Text className="text-white font-bold text-sm">WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleConnect}
            disabled={processing || requestStatus === "connected"}
            className={`flex-1 py-3.5 rounded-xl flex-row justify-center items-center shadow-sm border ${
              requestStatus === "connected" 
                ? "bg-green-100 border-green-200" 
                : requestStatus === "pending"
                ? "bg-yellow-50 border-yellow-200"
                : "bg-gray-900 border-gray-900"
            }`}
          >
            {processing ? (
              <ActivityIndicator color={requestStatus === "none" ? "white" : "gray"} size="small" />
            ) : (
              <>
                <Ionicons 
                  name={requestStatus === "connected" ? "checkmark" : requestStatus === "pending" ? "time" : "person-add"} 
                  size={18} 
                  color={requestStatus === "none" ? "white" : requestStatus === "connected" ? "#16A34A" : "#CA8A04"} 
                  style={{ marginRight: 6 }} 
                />
                <Text className={`font-bold text-sm ${
                   requestStatus === "connected" ? "text-green-700" : requestStatus === "pending" ? "text-yellow-700" : "text-white"
                }`}>
                  {requestStatus === "connected" ? "Connected" : requestStatus === "pending" ? "Pending" : "Connect"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Text className="px-6 mt-4 text-lg font-black text-gray-900">
        Inventory <Text className="text-gray-400 font-medium text-sm">({inventory.length})</Text>
      </Text>
    </View>
  );

  const renderProduct = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => console.log("Product clicked")} // Navigate to details if needed
      style={{ width: COLUMN_WIDTH }}
      className="bg-white rounded-2xl mb-4 shadow-sm shadow-gray-200 border border-gray-100 overflow-hidden"
    >
      <View className="h-40 bg-gray-100 relative">
        <Image source={{ uri: item.images?.[0] }} className="w-full h-full" resizeMode="cover" />
        <View className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded-lg backdrop-blur-sm">
          <Text className="text-white font-bold text-xs">₹{parseInt(item.price).toLocaleString()}</Text>
        </View>
      </View>

      <View className="p-3">
        <Text numberOfLines={1} className="font-bold text-gray-900 text-sm mb-1 leading-5">
          {item.name}
        </Text>
        <Text numberOfLines={1} className="text-gray-400 text-xs mb-3">
          {item.extractedData?.brand || "Phone"} • {item.extractedData?.storageGb ? `${item.extractedData.storageGb}GB` : "Mint"}
        </Text>
        
        <View className="flex-row items-center justify-between">
            <View className="bg-indigo-50 px-2 py-1 rounded-md">
                <Text className="text-[10px] font-bold text-indigo-600 uppercase">View</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" />

      {/* FIXED BACK BUTTON */}
      <View className="absolute top-12 left-5 z-20">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-black/20 rounded-full items-center justify-center backdrop-blur-md border border-white/20"
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={inventory}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 50 }}
        columnWrapperStyle={{ paddingHorizontal: 24, justifyContent: "space-between" }}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View className="py-20 items-center opacity-50">
            <Ionicons name="cube-outline" size={48} color="gray" />
            <Text className="text-gray-400 mt-2 font-medium">No items in stock</Text>
          </View>
        )}
      />
    </View>
  );
}