import { auth, db } from "@/FirebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// --- CONFIGURATION ---
// ⚠️ SECURITY WARNING: Storing the Server Key in the frontend is risky for production apps.
// For a real app, you should move this logic to a Firebase Cloud Function.
const FIREBASE_SERVER_KEY = "PASTE_YOUR_FIREBASE_SERVER_KEY_HERE"; 

// --- TYPES ---
type Tab = "overview" | "requests" | "dealers" | "inventory";

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Broadcast State
  const [isBroadcastVisible, setIsBroadcastVisible] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Data
  const [stats, setStats] = useState({ dealers: 0, phones: 0, value: 0, pending: 0 });
  const [dealers, setDealers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // --- FETCHING ---
  const fetchData = async () => {
    setLoading(true);
    try {
      console.log("--- 🔄 START FETCHING ADMIN DATA ---");

      // 1. Fetch Dealers (Users)
      const usersSnap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
      const usersData = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDealers(usersData);

      // 2. Fetch Products
      const productsSnap = await getDocs(query(collection(db, "products"), orderBy("createdAt", "desc"), limit(50)));
      const productsData = productsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProducts(productsData);

      // 3. Fetch Pending Requests
      const requestsSnap = await getDocs(collection(db, "pending-request"));
      let requestsData = requestsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      requestsData = requestsData.sort((a: any, b: any) => {
          const dateA = a.createdAt || 0;
          const dateB = b.createdAt || 0;
          return dateB - dateA;
      });

      setPendingRequests(requestsData);

      // 4. Calculate Stats
      const totalValue = productsData.reduce((sum, item: any) => sum + (Number(item.price) || 0), 0);

      setStats({
        dealers: usersData.length,
        phones: productsData.length,
        value: totalValue,
        pending: requestsData.length,
      });

    } catch (error: any) {
      console.error("❌ FETCH ERROR:", error);
      Alert.alert("Error", "Could not fetch admin data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // --- 🔥 FIREBASE MESSAGING LOGIC ---

  const handleSendBroadcast = async () => {
    if(!broadcastTitle || !broadcastBody) {
        Alert.alert("Missing Info", "Please enter a title and message.");
        return;
    }

    setSendingBroadcast(true);

    try {
        // 1. Save Broadcast to History
        await addDoc(collection(db, "broadcasts"), {
            title: broadcastTitle,
            body: broadcastBody,
            createdAt: Date.now(),
            sentBy: "Admin"
        });

        // 2. Collect FCM Tokens
        // Assuming your 'users' collection has a field 'fcmToken' (or 'pushToken')
        const tokens: string[] = [];
        dealers.forEach((user) => {
            // Check for both common naming conventions
            const token = user.fcmToken || user.pushToken;
            if (token && typeof token === 'string') {
                tokens.push(token);
            }
        });

        // 3. Send via Firebase FCM API
        if (tokens.length > 0) {
            await sendToFirebaseFCM(tokens, broadcastTitle, broadcastBody);
            Alert.alert("Success", `Message sent via Firebase to ${tokens.length} users.`);
        } else {
            Alert.alert("Saved", "Broadcast saved, but no active FCM tokens found.");
        }

        // Cleanup
        setBroadcastTitle("");
        setBroadcastBody("");
        setIsBroadcastVisible(false);

    } catch (error: any) {
        console.error("Broadcast Error:", error);
        Alert.alert("Error", "Failed to send broadcast: " + error.message);
    } finally {
        setSendingBroadcast(false);
    }
  };

  const sendToFirebaseFCM = async (tokens: string[], title: string, body: string) => {
    // FCM allows sending to up to 1000 tokens in one request using 'registration_ids'
    // If you have >1000 users, you need to chunk this array.
    
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FIREBASE_SERVER_KEY}`,
      },
      body: JSON.stringify({
        registration_ids: tokens,
        notification: {
          title: title,
          body: body,
          sound: "default",
          priority: "high"
        },
        data: {
          type: "broadcast_alert", // Custom data payload
          screen: "notifications"
        }
      }),
    });

    const data = await response.json();
    console.log("FCM Response:", data);
    
    if (data.failure > 0) {
        console.warn(`${data.failure} messages failed to send.`);
    }
  };

  // --- OTHER ACTIONS ---

  const handleRequestAction = async (request: any, action: "approve" | "reject") => {
    const targetUserId = request.uid || request.userId || request.user_id || request.id;

    if (!targetUserId) {
        Alert.alert("Error", "Cannot find User ID in this request.");
        return;
    }

    Alert.alert(
      `${action === "approve" ? "Approve" : "Reject"} Dealer?`,
      `Confirm ${action} for ${request.displayName || "User"}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", 
          style: action === "reject" ? "destructive" : "default",
          onPress: async () => {
            try {
              const userRef = doc(db, "users", targetUserId);

              if (action === "approve") {
                  await setDoc(userRef, { 
                    onboardingStatus: "approved",
                    role: "dealer",
                    displayName: request.displayName || "",
                    email: request.email || "",
                    shopName: request.shopName || "",
                    city: request.city || "",
                    createdAt: request.createdAt || Date.now()
                  }, { merge: true });
              } else {
                  await setDoc(userRef, { onboardingStatus: "rejected", role: "user" }, { merge: true });
              }

              await deleteDoc(doc(db, "pending-request", request.id));

              setPendingRequests(prev => prev.filter(r => r.id !== request.id));
              setStats(prev => ({ ...prev, pending: prev.pending - 1 }));
              
              if (action === "approve") {
                 const newUser = { ...request, id: targetUserId, onboardingStatus: "approved", role: "dealer" };
                 setDealers(prev => [newUser, ...prev]);
              }

              Alert.alert("Success", `Dealer ${action}d successfully.`);
            } catch (error: any) {
              Alert.alert("Error", "Action failed: " + error.message);
            }
          }
        }
      ]
    );
  };

  const toggleUserStatus = async (dealer: any) => {
    const newStatus = dealer.status === "suspended" ? "active" : "suspended";
    
    Alert.alert(
      `Change Status`,
      `Set ${dealer.displayName} to ${newStatus.toUpperCase()}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", 
          style: newStatus === "suspended" ? "destructive" : "default",
          onPress: async () => {
            await updateDoc(doc(db, "users", dealer.id), { status: newStatus });
            setDealers(dealers.map(d => d.id === dealer.id ? { ...d, status: newStatus } : d));
          }
        }
      ]
    );
  };

  const handleDeleteProduct = async (productId: string) => {
    Alert.alert("Delete Listing?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "products", productId));
            setProducts(products.filter(p => p.id !== productId));
            Alert.alert("Deleted", "Phone removed.");
          } catch (e) {
            Alert.alert("Error", "Could not delete.");
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    auth.signOut();
    router.replace("/login");
  };

  // --- RENDERERS ---

  const renderStatCard = (title: string, value: string | number, icon: any, color: string) => (
    <View className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex-1 mx-1.5 min-w-[100px]">
      <View className={`w-10 h-10 rounded-full items-center justify-center mb-3 ${color}`}>
        <Ionicons name={icon} size={20} color="white" />
      </View>
      <Text className="text-gray-400 text-xs font-bold uppercase">{title}</Text>
      <Text className="text-gray-900 text-2xl font-black mt-1">{value}</Text>
    </View>
  );

  const renderRequestItem = ({ item }: { item: any }) => (
    <View className="bg-white p-4 rounded-xl border border-gray-100 mb-3">
        <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 bg-yellow-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="time" size={20} color="#CA8A04" />
                </View>
                <View>
                    <Text className="font-bold text-gray-900 text-base">{item.displayName || "Unknown"}</Text>
                    <Text className="text-xs text-gray-500">{item.shopName || "Mobile Shop"}</Text>
                </View>
            </View>
            <View className="bg-yellow-50 px-2 py-1 rounded">
                <Text className="text-[10px] font-bold text-yellow-600">WAITING</Text>
            </View>
        </View>
        <View className="flex-row gap-3">
            <TouchableOpacity onPress={() => handleRequestAction(item, "reject")} className="flex-1 py-3 rounded-lg border border-red-100 bg-red-50 items-center">
                <Text className="text-red-600 font-bold text-sm">Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleRequestAction(item, "approve")} className="flex-1 py-3 rounded-lg bg-black items-center shadow-sm">
                <Text className="text-white font-bold text-sm">Approve</Text>
            </TouchableOpacity>
        </View>
    </View>
  );

  const renderDealerItem = ({ item }: { item: any }) => (
    <View className="bg-white p-4 rounded-xl border border-gray-100 mb-3 flex-row items-center justify-between">
      <View className="flex-row items-center flex-1">
        <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
           <Text className="font-bold text-gray-500">{item.displayName?.charAt(0).toUpperCase()}</Text>
        </View>
        <View>
           <Text className="font-bold text-gray-900">{item.displayName}</Text>
           <Text className="text-xs text-gray-500">{item.email}</Text>
           <Text className={`text-[10px] font-bold mt-1 ${item.status === 'suspended' ? 'text-red-600' : 'text-green-600'}`}>
              {item.status === 'suspended' ? 'BLOCKED' : 'ACTIVE'}
           </Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => toggleUserStatus(item)} className="p-2 bg-gray-50 rounded-lg">
         <Ionicons name="settings-outline" size={20} color="black" />
      </TouchableOpacity>
    </View>
  );

  const renderProductItem = ({ item }: { item: any }) => (
    <View className="bg-white p-3 rounded-xl border border-gray-100 mb-3 flex-row">
      <Image source={{ uri: item.images?.[0] }} className="w-20 h-20 rounded-lg bg-gray-200" resizeMode="cover" />
      <View className="flex-1 ml-3 justify-between">
         <View>
            <Text numberOfLines={1} className="font-bold text-gray-900">{item.name}</Text>
            <Text className="text-gray-500 text-xs mt-1">Seller: {item.dealerName}</Text>
            <Text className="text-indigo-600 font-bold text-sm mt-1">₹{item.price}</Text>
         </View>
         <TouchableOpacity onPress={() => handleDeleteProduct(item.id)} className="self-end bg-red-50 px-3 py-1.5 rounded-lg flex-row items-center">
            <Ionicons name="trash" size={14} color="#EF4444" />
            <Text className="text-red-600 text-xs font-bold ml-1">Del</Text>
         </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="px-6 py-4 bg-white border-b border-gray-100 flex-row justify-between items-center">
        <View>
          <Text className="text-xs font-bold text-gray-400 uppercase">System Admin</Text>
          <Text className="text-2xl font-black text-gray-900">Control Center</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} className="bg-gray-100 p-2 rounded-full">
           <Ionicons name="log-out-outline" size={20} color="black" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View>
        <FlatList 
            horizontal
            showsHorizontalScrollIndicator={false}
            data={['overview', 'requests', 'dealers', 'inventory']}
            keyExtractor={(item) => item}
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16, gap: 12 }}
            renderItem={({ item }) => (
                <TouchableOpacity 
                    onPress={() => setActiveTab(item as Tab)}
                    className={`px-5 py-2.5 rounded-full border flex-row items-center ${
                    activeTab === item ? 'bg-black border-black' : 'bg-white border-gray-200'}`}
                >
                    <Text className={`font-bold capitalize mr-1 ${activeTab === item ? 'text-white' : 'text-gray-600'}`}>
                        {item}
                    </Text>
                    {item === 'requests' && stats.pending > 0 && <View className="bg-red-500 w-2 h-2 rounded-full ml-1" />}
                </TouchableOpacity>
            )}
        />
      </View>

      {/* Content */}
      <View className="flex-1 px-6">
        {loading ? (
           <ActivityIndicator size="large" className="mt-10" />
        ) : (
           <>
             {activeTab === "overview" && (
                <View className="flex-1">
                   <Text className="text-lg font-bold text-gray-900 mb-4">Marketplace Stats</Text>
                   <View className="flex-row flex-wrap -mx-1.5">
                      {renderStatCard("Total Dealers", stats.dealers, "people", "bg-indigo-500")}
                      {renderStatCard("Pending Req.", stats.pending, "time", "bg-yellow-500")}
                   </View>
                   <View className="mt-3 flex-row -mx-1.5">
                      {renderStatCard("Live Phones", stats.phones, "phone-portrait", "bg-orange-500")}
                      {renderStatCard("Inventory Value", `₹${(stats.value / 10000000).toFixed(1)}Cr`, "pricetag", "bg-green-500")}
                   </View>

                   <Text className="text-lg font-bold text-gray-900 mt-8 mb-4">Quick Actions</Text>
                   <TouchableOpacity onPress={() => setActiveTab("requests")} className="bg-white p-4 rounded-xl border border-gray-100 flex-row items-center mb-3">
                      <View className="w-10 h-10 bg-yellow-100 rounded-full items-center justify-center mr-3">
                         <Ionicons name="person-add" size={20} color="#CA8A04" />
                      </View>
                      <Text className="font-bold text-gray-700">Review {stats.pending} Applications</Text>
                   </TouchableOpacity>
                   
                   <TouchableOpacity onPress={() => setIsBroadcastVisible(true)} className="bg-white p-4 rounded-xl border border-gray-100 flex-row items-center">
                      <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                         <Ionicons name="megaphone" size={20} color="#2563EB" />
                      </View>
                      <Text className="font-bold text-gray-700">Broadcast Alert</Text>
                   </TouchableOpacity>
                </View>
             )}

             {activeTab === "requests" && (
                <FlatList
                   data={pendingRequests}
                   keyExtractor={item => item.id}
                   renderItem={renderRequestItem}
                   refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                   showsVerticalScrollIndicator={false}
                   contentContainerStyle={{ paddingBottom: 50 }}
                   ListEmptyComponent={<View className="items-center mt-10"><Text className="text-gray-400">No pending requests.</Text></View>}
                />
             )}

             {activeTab === "dealers" && (
                <FlatList
                   data={dealers}
                   keyExtractor={item => item.id}
                   renderItem={renderDealerItem}
                   refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                   showsVerticalScrollIndicator={false}
                   contentContainerStyle={{ paddingBottom: 50 }}
                />
             )}

             {activeTab === "inventory" && (
                <FlatList
                   data={products}
                   keyExtractor={item => item.id}
                   renderItem={renderProductItem}
                   refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                   showsVerticalScrollIndicator={false}
                   contentContainerStyle={{ paddingBottom: 50 }}
                />
             )}
           </>
        )}
      </View>

      {/* --- BROADCAST MODAL --- */}
      <Modal visible={isBroadcastVisible} transparent animationType="slide" onRequestClose={() => setIsBroadcastVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end bg-black/60">
            <View className="bg-white rounded-t-3xl p-6 pb-10">
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-xl font-bold text-gray-900">New Broadcast</Text>
                    <TouchableOpacity onPress={() => setIsBroadcastVisible(false)} className="bg-gray-100 p-2 rounded-full">
                        <Ionicons name="close" size={20} color="black" />
                    </TouchableOpacity>
                </View>

                <View className="space-y-4">
                    <View>
                        <Text className="text-gray-500 font-bold text-xs uppercase mb-1">Alert Title</Text>
                        <TextInput value={broadcastTitle} onChangeText={setBroadcastTitle} placeholder="e.g. Server Maintenance" className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-gray-900 font-bold" />
                    </View>
                    <View>
                        <Text className="text-gray-500 font-bold text-xs uppercase mb-1">Message Body</Text>
                        <TextInput value={broadcastBody} onChangeText={setBroadcastBody} placeholder="Type your message to all users..." multiline numberOfLines={4} textAlignVertical="top" className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-gray-900 h-32" />
                    </View>

                    <TouchableOpacity onPress={handleSendBroadcast} disabled={sendingBroadcast} className="bg-blue-600 py-4 rounded-xl items-center mt-2 flex-row justify-center">
                        {sendingBroadcast ? <ActivityIndicator color="white" /> : (
                            <>
                                <Ionicons name="paper-plane" size={20} color="white" style={{ marginRight: 8 }} />
                                <Text className="text-white font-bold text-lg">Send via Firebase</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}