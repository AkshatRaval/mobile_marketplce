import { SearchBar } from "@/src/components/SearchBar";
import { supabase } from "@/src/supabaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// --- CONFIGURATION ---
// ⚠️ SECURITY WARNING: Storing the Server Key in the frontend is risky.
// Move this to a Supabase Edge Function in production.
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

  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Selection
  const [selectedDealer, setSelectedDealer] = useState<any>(null);
  const [isDealerActionModalVisible, setIsDealerActionModalVisible] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
    isDestructive?: boolean;
    confirmText?: string;
  }>({
    visible: false,
    title: "",
    message: "",
    action: async () => { },
  });

  // Settings Modal
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

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
      console.log("--- 🔄 START FETCHING ADMIN DATA (Supabase) ---");

      // 1. Fetch Dealers (Profiles where role is dealer OR user)
      // We map snake_case to camelCase for the UI
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (profilesError) throw profilesError;

      const formattedDealers = profiles.map(p => ({
        id: p.id,
        displayName: p.display_name,
        shopName: p.shop_name,
        email: p.email,
        phone: p.phone,
        status: p.status || 'active',
        role: p.role,
        fcmToken: p.fcm_token,
        onboardingStatus: p.onboarding_status,
        photoURL: p.photo_url,
        createdAt: new Date(p.created_at).getTime()
      }));

      setDealers(formattedDealers);

      // 2. Fetch Products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
            *,
            profiles (display_name, shop_name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (productsError) throw productsError;

      const formattedProducts = productsData.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        images: p.images,
        dealerName: p.profiles?.display_name || p.profiles?.shop_name || "Unknown",
        userId: p.user_id
      }));

      setProducts(formattedProducts);

      // 3. Fetch Pending Requests
      // In Supabase, this is just profiles where onboarding_status is 'submitted'
      const pendingData = formattedDealers.filter(d => d.onboardingStatus === 'submitted');
      setPendingRequests(pendingData);

      // 4. Calculate Stats
      const totalValue = formattedProducts.reduce((sum, item: any) => sum + (Number(item.price) || 0), 0);

      setStats({
        dealers: formattedDealers.length,
        phones: formattedProducts.length,
        value: totalValue,
        pending: pendingData.length,
      });

    } catch (error: any) {
      console.error("❌ FETCH ERROR:", error.message);
      Alert.alert("Error", "Could not fetch admin data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Dealers
  const filteredDealers = useMemo(() => {
    if (!searchQuery.trim()) return dealers;
    const lowerQuery = searchQuery.toLowerCase();
    return dealers.filter(
      (d) =>
        d.displayName?.toLowerCase().includes(lowerQuery) ||
        d.shopName?.toLowerCase().includes(lowerQuery) ||
        d.email?.toLowerCase().includes(lowerQuery) ||
        d.phone?.includes(lowerQuery)
    );
  }, [dealers, searchQuery]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const lowerQuery = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(lowerQuery) ||
        p.dealerName?.toLowerCase().includes(lowerQuery)
    );
  }, [products, searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // --- 🔥 FIREBASE MESSAGING LOGIC ---

  const handleSendBroadcast = async () => {
    if (!broadcastTitle || !broadcastBody) {
      Alert.alert("Missing Info", "Please enter a title and message.");
      return;
    }

    setSendingBroadcast(true);

    try {
      // 1. Save Broadcast to History (Supabase Table)
      await supabase.from("broadcasts").insert({
        title: broadcastTitle,
        body: broadcastBody,
        sent_by: "Admin"
      });

      // 2. Collect FCM Tokens from Profiles
      const { data: tokensData } = await supabase
        .from("profiles")
        .select("fcm_token")
        .not("fcm_token", "is", null); // Only users with tokens

      const tokens: string[] = tokensData?.map(t => t.fcm_token).filter(Boolean) || [];

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
      Alert.alert("Error", "Failed to send broadcast.");
    } finally {
      setSendingBroadcast(false);
    }
  };

  const sendToFirebaseFCM = async (tokens: string[], title: string, body: string) => {
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
          type: "broadcast_alert",
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
    const targetUserId = request.id; // In mapped data, id is the user ID

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
              // In Supabase, we just update the profile status
              const updates = action === "approve"
                ? { onboarding_status: "approved", role: "dealer" }
                : { onboarding_status: "rejected", role: "user" };

              const { error } = await supabase
                .from("profiles")
                .update(updates)
                .eq("id", targetUserId);

              if (error) throw error;

              // Optimistic UI Update
              setPendingRequests(prev => prev.filter(r => r.id !== targetUserId));
              setStats(prev => ({ ...prev, pending: prev.pending - 1 }));

              if (action === "approve") {
                // Update the main dealers list if they are approved
                setDealers(prev => prev.map(d => d.id === targetUserId ? { ...d, onboardingStatus: "approved", role: "dealer" } : d));
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
    // Requires a 'status' column in 'profiles' table. 
    // Run: alter table public.profiles add column status text default 'active';
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
            await supabase.from("profiles").update({ status: newStatus }).eq("id", dealer.id);
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
            const { error } = await supabase.from("products").delete().eq("id", productId);
            if (error) throw error;

            setProducts(products.filter(p => p.id !== productId));
            Alert.alert("Deleted", "Phone removed.");
          } catch (e) {
            Alert.alert("Error", "Could not delete.");
          }
        },
      },
    ]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
    <TouchableOpacity
      onPress={() => {
        setSelectedDealer(item);
        setIsDealerActionModalVisible(true);
      }}
      className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 flex-row items-center shadow-sm active:opacity-70"
    >
      <View className="relative">
        <Image
          source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${item.displayName}&background=random` }}
          className="w-12 h-12 rounded-full border-2 border-white bg-gray-100"
        />
        {item.status === 'suspended' && (
          <View className="absolute -bottom-1 -right-1 bg-red-500 w-4 h-4 rounded-full border-2 border-white" />
        )}
      </View>

      <View className="flex-1 ml-4">
        <View className="flex-row justify-between items-start">
          <View>
            <Text className="font-bold text-gray-900 text-base">{item.displayName}</Text>
            <Text className="text-gray-500 text-xs mb-1">{item.shopName || "No Shop Name"}</Text>
          </View>
          <View className={`px-2 py-0.5 rounded-full ${item.status === 'suspended' ? 'bg-red-100' : 'bg-green-100'}`}>
            <Text className={`text-[10px] font-bold uppercase ${item.status === 'suspended' ? 'text-red-700' : 'text-green-700'}`}>
              {item.status === 'suspended' ? 'Suspended' : 'Active'}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center mt-1 space-x-3">
          <View className="flex-row items-center">
            <Ionicons name="mail-outline" size={12} color="#9CA3AF" />
            <Text className="text-[10px] text-gray-400 ml-1">{item.email?.substring(0, 15)}...</Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="call-outline" size={12} color="#9CA3AF" />
            <Text className="text-[10px] text-gray-400 ml-1">{item.phone || "N/A"}</Text>
          </View>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color="#E5E7EB" />
    </TouchableOpacity>
  );

  const renderProductItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => router.push(`/product/${item.id}`)}
      className="bg-white p-3 rounded-xl border border-gray-100 mb-3 flex-row active:opacity-70"
    >
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
    </TouchableOpacity>
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
        <TouchableOpacity onPress={() => setIsSettingsVisible(true)} className="bg-gray-100 p-2.5 rounded-full active:bg-gray-200">
          <Ionicons name="settings-outline" size={20} color="black" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View>
        <FlashList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['overview', 'requests', 'dealers', 'inventory']}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16, gap: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setActiveTab(item as Tab)}
              className={`px-5 py-2.5 rounded-full border flex-row items-center ${activeTab === item ? 'bg-black border-black' : 'bg-white border-gray-200'}`}
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
              <FlashList
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
              <View className="flex-1">
                <View className="mb-4">
                  <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onClear={() => setSearchQuery("")}
                  />
                </View>
                <FlashList
                  data={filteredDealers}
                  keyExtractor={item => item.id}
                  renderItem={renderDealerItem}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 50 }}
                  ListEmptyComponent={
                    <View className="items-center mt-10 opacity-50">
                      <Ionicons name="search" size={48} color="gray" />
                      <Text className="text-gray-500 font-bold mt-4">No dealers found</Text>
                    </View>
                  }
                />
              </View>
            )}

            {activeTab === "inventory" && (
              <View className="flex-1">
                <View className="mb-4">
                  <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onClear={() => setSearchQuery("")}
                  />
                </View>
                <FlashList
                  data={filteredProducts}
                  keyExtractor={item => item.id}
                  renderItem={renderProductItem}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 50 }}
                  ListEmptyComponent={
                    <View className="items-center mt-10 opacity-50">
                      <Ionicons name="search" size={48} color="gray" />
                      <Text className="text-gray-500 font-bold mt-4">No products found</Text>
                    </View>
                  }
                />
              </View>
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

      {/* --- CUSTOM CONFIRMATION MODAL --- */}
      <Modal visible={confirmModal.visible} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-white p-6 rounded-3xl w-full shadow-2xl">
            <View className={`w-12 h-12 rounded-full items-center justify-center mb-4 ${confirmModal.isDestructive ? "bg-red-100" : "bg-indigo-100"}`}>
              <Ionicons name={confirmModal.isDestructive ? "alert-circle" : "information-circle"} size={28} color={confirmModal.isDestructive ? "#DC2626" : "#4F46E5"} />
            </View>
            <Text className="text-xl font-black text-gray-900 mb-2">{confirmModal.title}</Text>
            <Text className="text-gray-500 font-medium mb-6 leading-6">{confirmModal.message}</Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
                className="flex-1 py-3.5 rounded-xl bg-gray-100 items-center justify-center"
              >
                <Text className="font-bold text-gray-900">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  await confirmModal.action();
                  setConfirmModal(prev => ({ ...prev, visible: false }));
                }}
                className={`flex-1 py-3.5 rounded-xl items-center justify-center shadow-sm ${confirmModal.isDestructive ? "bg-red-600" : "bg-black"}`}
              >
                <Text className="font-bold text-white">{confirmModal.confirmText || "Confirm"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- DEALER ACTION MODAL --- */}
      <Modal visible={isDealerActionModalVisible} transparent animationType="slide" onRequestClose={() => setIsDealerActionModalVisible(false)}>
        <Pressable className="flex-1 bg-black/60 justify-end" onPress={() => setIsDealerActionModalVisible(false)}>
          <View className="bg-white rounded-t-[32px] p-6 pb-10">
            <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-6" />

            {selectedDealer && (
              <>
                <View className="flex-row items-center mb-8">
                  <Image
                    source={{ uri: selectedDealer.photoURL || `https://ui-avatars.com/api/?name=${selectedDealer.displayName}&background=random` }}
                    className="w-16 h-16 rounded-full border-2 border-gray-100 mr-4"
                  />
                  <View>
                    <Text className="text-2xl font-black text-gray-900">{selectedDealer.displayName}</Text>
                    <Text className="text-gray-500 font-medium">{selectedDealer.shopName || "Unknown Shop"}</Text>
                  </View>
                </View>

                <View className="gap-3">
                  <TouchableOpacity
                    onPress={() => {
                      setIsDealerActionModalVisible(false);
                      router.push(`/dealer/${selectedDealer.id}`);
                    }}
                    className="flex-row items-center p-4 bg-gray-50 rounded-2xl active:bg-gray-100"
                  >
                    <View className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm mr-4">
                      <Ionicons name="person-outline" size={20} color="black" />
                    </View>
                    <Text className="font-bold text-gray-900 text-lg">View Full Details</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setIsDealerActionModalVisible(false);
                      toggleUserStatus(selectedDealer);
                    }}
                    className="flex-row items-center p-4 bg-gray-50 rounded-2xl active:bg-gray-100"
                  >
                    <View className={`w-10 h-10 rounded-full items-center justify-center shadow-sm mr-4 ${selectedDealer.status === 'suspended' ? 'bg-green-100' : 'bg-red-100'}`}>
                      <Ionicons name={selectedDealer.status === 'suspended' ? "checkmark-circle" : "ban"} size={20} color={selectedDealer.status === 'suspended' ? "green" : "red"} />
                    </View>
                    <Text className={`font-bold text-lg ${selectedDealer.status === 'suspended' ? 'text-green-700' : 'text-red-700'}`}>
                      {selectedDealer.status === 'suspended' ? 'Unblock Dealer' : 'Suspend Dealer'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* --- SETTINGS MODAL --- */}
      <Modal visible={isSettingsVisible} transparent animationType="fade" onRequestClose={() => setIsSettingsVisible(false)}>
        <Pressable className="flex-1 bg-black/60 justify-end" onPress={() => setIsSettingsVisible(false)}>
          <View className="bg-white rounded-t-[32px] p-8 pb-12 w-full">
            <Text className="text-2xl font-black text-gray-900 mb-4">Admin Settings</Text>

            <TouchableOpacity
              onPress={() => {
                setIsSettingsVisible(false);
                handleLogout();
              }}
              className="flex-row items-center py-4 border-t border-gray-100 mt-2"
            >
              <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center mr-4">
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              </View>
              <Text className="font-bold text-red-600 text-lg flex-1">Log Out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}