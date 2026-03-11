import { SkeletonList } from "@/src/components/Skeleton";
import { useAuth } from "@/src/context/AuthContext";
import { useConnectionStatus } from "@/src/hooks/useConnectionStatus";
import { useProfileData } from "@/src/hooks/useProfileData";
import { publicProfileApi } from "@/src/services/api/publicProfileApi";
import { supabase } from "@/src/supabaseConfig";
import { communications } from "@/src/utils/communications";
import { getMainImage } from "@/src/utils/helpers";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DisconnectModal = ({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View className="flex-1 bg-black/50 justify-center items-center px-6">
      <View className="bg-white w-full rounded-3xl p-6 items-center shadow-lg">
        <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4">
          <Ionicons name="alert-circle" size={32} color="#EF4444" />
        </View>

        <Text className="text-xl font-bold text-gray-900 text-center mb-2">
          Disconnect?
        </Text>
        <Text className="text-gray-500 text-center mb-8 px-4">
          Are you sure you want to remove this user from your connections?
        </Text>

        <View className="flex-row gap-3 w-full">
          <TouchableOpacity
            onPress={onClose}
            className="flex-1 py-4 rounded-xl bg-gray-100 active:bg-gray-200"
          >
            <Text className="text-center font-bold text-gray-700">Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onConfirm}
            className="flex-1 py-4 rounded-xl bg-red-500 active:bg-red-600 shadow-sm shadow-red-200"
          >
            <Text className="text-center font-bold text-white">Disconnect</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const ListHeader = ({
  router,
  user,
  userId,
  profileData,
  listings,
  connectionsUsers,
  connectionStatus,
  handleSendConnectionRequest,
  handleWhatsAppPress,
  handleDisconnect,
  searchQuery,
  setSearchQuery,
}: {
  router: any;
  user: any;
  userId: string;
  profileData: any;
  listings: any[];
  connectionsUsers: any[];
  connectionStatus: string;
  handleSendConnectionRequest: () => void;
  handleWhatsAppPress: () => void;
  handleDisconnect: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) => (
  <View className="bg-white">
    <View className="flex-row items-center justify-between px-6 pt-4 mb-6">
      <View className="flex-row items-center flex-1">
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-gray-50 p-2.5 rounded-2xl active:bg-gray-200 mr-4"
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-[2px]">
          USER PROFILE
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleWhatsAppPress}
        className="bg-green-500 p-2.5 rounded-2xl active:bg-green-600"
      >
        <Ionicons name="logo-whatsapp" size={20} color="white" />
      </TouchableOpacity>
    </View>

    <View className="px-6 flex-row items-center mb-6">
      <Image
        source={{
          uri:
            profileData?.photoURL ??
            `https://ui-avatars.com/api/?name=${profileData?.displayName || "User"
            }&background=random`,
        }}
        className="w-20 h-20 rounded-full border-4 border-gray-50 mr-5 bg-gray-100"
      />
      <View className="flex-1">
        <Text className="text-2xl font-black text-gray-900 leading-tight">
          {profileData?.displayName || "User"}
        </Text>
        <Text className="text-indigo-600 font-bold text-xs uppercase tracking-wider">
          {profileData?.shopName || "Member"}
        </Text>
        <View className="flex-row items-center mt-3 gap-6">
          <View>
            <Text className="text-lg font-black">{listings.length}</Text>
            <Text className="text-[9px] font-bold text-gray-400 uppercase">
              Listings
            </Text>
          </View>
          <View className="w-[1px] h-6 bg-gray-100" />
          <TouchableOpacity
            onPress={() => router.push({
              pathname: "/(dealer)/services/connections",
              params: { userId: userId }
            })}
            className="items-center"
          >
            <Text className="text-lg font-black text-indigo-600">
              {connectionsUsers.length}
            </Text>
            <Text className="text-[9px] font-bold text-gray-900 uppercase">
              Circle
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>

    {user?.id !== userId && (
      <View className="px-6 mb-4">
        {connectionStatus === "connected" ? (
          <View className="flex-row gap-2">
            <View className="bg-green-50 px-4 py-3 rounded-2xl flex-row items-center justify-center flex-1">
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text className="ml-2 font-bold text-green-600">Connected</Text>
            </View>
            <TouchableOpacity
              onPress={handleDisconnect}
              className="bg-red-50 px-4 py-3 rounded-2xl flex-row items-center justify-center flex-1 active:bg-red-100"
            >
              <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
              <Text className="ml-2 font-bold text-red-600">Disconnect</Text>
            </TouchableOpacity>
          </View>
        ) : connectionStatus === "pending" ? (
          <View className="bg-gray-100 px-4 py-3 rounded-2xl flex-row items-center justify-center">
            <Ionicons name="time-outline" size={20} color="#6B7280" />
            <Text className="ml-2 font-bold text-gray-600">Request Sent</Text>
          </View>
        ) : connectionStatus === "received" ? (
          <View className="bg-blue-50 px-4 py-3 rounded-2xl flex-row items-center justify-center">
            <Ionicons name="mail-outline" size={20} color="#3B82F6" />
            <Text className="ml-2 font-bold text-blue-600">
              Request Received
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleSendConnectionRequest}
            className="bg-black px-4 py-3 rounded-2xl flex-row items-center justify-center active:bg-gray-800"
          >
            <Ionicons name="person-add" size={20} color="white" />
            <Text className="ml-2 font-bold text-white">
              Send Connection Request
            </Text>
          </TouchableOpacity>
        )}
      </View>
    )}

    <View className="px-6 mb-4">
      <View className="bg-gray-100 flex-row items-center px-4 py-2 rounded-2xl">
        <Ionicons name="search-outline" size={18} color="#9ca3af" />
        <TextInput
          placeholder="Search products..."
          className="flex-1 ml-3 font-bold text-gray-800 py-1"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
        {searchQuery !== "" && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>
    </View>

    {connectionsUsers.length > 0 && (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="pl-6 mb-4"
      >
        {connectionsUsers.map((u, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => router.push(`/(dealer)/profile/${u.uid}`)}
            className="mr-5 items-center"
          >
            <Image
              source={{
                uri:
                  u.photoURL ??
                  `https://ui-avatars.com/api/?name=${u.displayName}`,
              }}
              className="w-12 h-12 rounded-full border border-gray-100"
            />
            <Text className="text-[9px] text-gray-500 mt-1 font-medium">
              {u.displayName?.split(" ")[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    )}
    <View className="h-[1px] bg-gray-100 w-full" />
  </View>
);

function UserProfile() {
  const SCREEN_WIDTH = Dimensions.get("window").width;
  const WINDOW_HEIGHT = Dimensions.get("window").height;
  const GRID_ITEM_WIDTH = SCREEN_WIDTH / 3;

  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const userId = Array.isArray(id) ? id[0] : id;

  // Use existing hooks
  const {
    profileData,
    listings,
    connectionsUsers,
    refetch,
    loading: profileLoading,
  } = useProfileData(userId);
  const {
    status: connectionStatus,
    loading: connectionLoading,
    setStatus,
    refresh: refreshConnection,
  } = useConnectionStatus(user?.id, userId);

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [disconnectModalVisible, setDisconnectModalVisible] = useState(false);

  // Privacy state
  const [canViewProfile, setCanViewProfile] = useState(true);
  const [privacyMessage, setPrivacyMessage] = useState("");
  const [loadingPrivacy, setLoadingPrivacy] = useState(true);

  // --- PAGINATION ---
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filteredListings = useMemo(() => {
    if (!searchQuery.trim()) return listings;
    return listings.filter(
      (item: any) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, listings]);

  const paginatedListings = useMemo(
    () => filteredListings.slice(0, visibleCount),
    [filteredListings, visibleCount]
  );
  const hasMore = visibleCount < filteredListings.length;

  // Check privacy settings
  useEffect(() => {
    if (!user?.id || !userId) return;

    const checkPrivacy = async () => {
      try {
        const { data: targetProfile } = await supabase
          .from("profiles")
          .select("privacy_settings")
          .eq("id", userId)
          .single();

        const privacySetting = targetProfile?.privacy_settings || "Everyone";
        const isConnected = connectionStatus === "connected";

        if (privacySetting === "Everyone") {
          setCanViewProfile(true);
        } else if (privacySetting === "No one") {
          setCanViewProfile(false);
          setPrivacyMessage("This profile is private");
        } else if (privacySetting === "Connections only") {
          if (isConnected) {
            setCanViewProfile(true);
          } else {
            setCanViewProfile(false);
            setPrivacyMessage("Only connections can view this profile");
          }
        } else if (privacySetting === "Selected connections") {
          const { data: selectedConnections } = await supabase
            .from("selected_connections")
            .select("*")
            .eq("user_id", userId)
            .eq("selected_user_id", user.id);

          if (selectedConnections && selectedConnections.length > 0) {
            setCanViewProfile(true);
          } else {
            setCanViewProfile(false);
            setPrivacyMessage("Only selected connections can view this profile");
          }
        }
      } catch (error) {
        console.error("Error checking privacy:", error);
        setCanViewProfile(true);
      } finally {
        setLoadingPrivacy(false);
      }
    };

    checkPrivacy();
  }, [user?.id, userId, connectionStatus]);

  const handleSendConnectionRequest = async () => {
    if (!user?.id || !userId) return;

    try {
      await publicProfileApi.sendConnectionRequest(user.id, userId);
      setStatus("pending");
      Alert.alert("Success", "Connection request sent!");
      await refreshConnection();
    } catch (error) {
      console.error("Error sending connection request:", error);
      Alert.alert("Error", "Failed to send connection request");
    }
  };

  const handleDisconnect = async () => {
    setDisconnectModalVisible(true);
  };

  const confirmDisconnect = async () => {
    if (!user?.id || !userId) return;

    setDisconnectModalVisible(false);
    try {
      await publicProfileApi.cancelConnectionRequest(user.id, userId);
      setStatus("none");
      await refreshConnection();
    } catch (error) {
      console.error("Error disconnecting:", error);
      Alert.alert("Error", "Failed to disconnect");
    }
  };

  const handleWhatsAppPress = async () => {
    if (!profileData?.phone) {
      Alert.alert("No Info", "Phone number not available.");
      return;
    }
    await communications.openWhatsApp(
      profileData.phone,
      "No Info"
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setVisibleCount(PAGE_SIZE);
    await Promise.all([refetch(), refreshConnection()]);
    setRefreshing(false);
  };

  // Loading state
  if (loadingPrivacy || connectionLoading || profileLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "white", paddingTop: insets.top }}>
        <StatusBar barStyle="dark-content" />
        {/* Skeleton header */}
        <View style={{ flexDirection: "row", alignItems: "center", padding: 20, paddingTop: 16 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#E5E7EB" }} />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <View style={{ width: 140, height: 14, backgroundColor: "#E5E7EB", borderRadius: 7, marginBottom: 8 }} />
            <View style={{ width: 100, height: 11, backgroundColor: "#E5E7EB", borderRadius: 6, marginBottom: 8 }} />
            <View style={{ width: 80, height: 10, backgroundColor: "#E5E7EB", borderRadius: 5 }} />
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 20, marginBottom: 12 }} />
        <SkeletonList count={5} type="horizontal" />
      </View>
    );
  }

  // Privacy block screen
  if (!canViewProfile) {
    return (
      <View
        style={{ flex: 1, backgroundColor: "white", paddingTop: insets.top }}
      >
        <StatusBar barStyle="dark-content" />

        <View className="px-6 pt-4 pb-6 border-b border-gray-100">
          <View className="flex-row items-center mb-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-gray-50 p-2.5 rounded-2xl active:bg-gray-200 mr-4"
            >
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
            <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-[2px]">
              USER PROFILE
            </Text>
          </View>

          <View className="flex-row items-center">
            <Image
              source={{
                uri:
                  profileData?.photoURL ??
                  `https://ui-avatars.com/api/?name=${profileData?.displayName || "User"
                  }&background=random`,
              }}
              className="w-20 h-20 rounded-full border-4 border-gray-50 mr-5 bg-gray-100"
            />
            <View className="flex-1">
              <Text className="text-2xl font-black text-gray-900 leading-tight">
                {profileData?.displayName || "User"}
              </Text>
              <Text className="text-indigo-600 font-bold text-xs uppercase tracking-wider">
                {profileData?.shopName || "Member"}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-1 justify-center items-center px-10">
          <View className="bg-gray-100 p-6 rounded-3xl items-center">
            <Ionicons name="lock-closed" size={48} color="#9CA3AF" />
            <Text className="font-black text-xl text-gray-900 mt-4 text-center">
              Profile is Private
            </Text>
            <Text className="text-gray-500 mt-2 text-center text-sm">
              {privacyMessage}
            </Text>
          </View>

          {connectionStatus !== "connected" && (
            <View className="w-full mt-8">
              {connectionStatus === "pending" ? (
                <View className="bg-gray-100 px-6 py-4 rounded-2xl flex-row items-center justify-center">
                  <Ionicons name="time-outline" size={20} color="#6B7280" />
                  <Text className="ml-2 font-bold text-gray-600">
                    Request Sent
                  </Text>
                </View>
              ) : connectionStatus === "received" ? (
                <View className="bg-blue-50 px-6 py-4 rounded-2xl flex-row items-center justify-center">
                  <Ionicons name="mail-outline" size={20} color="#3B82F6" />
                  <Text className="ml-2 font-bold text-blue-600">
                    Request Received
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleSendConnectionRequest}
                  className="bg-black px-6 py-4 rounded-2xl flex-row items-center justify-center active:bg-gray-800"
                >
                  <Ionicons name="person-add" size={20} color="white" />
                  <Text className="ml-2 font-bold text-white">
                    Send Connection Request
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <TouchableOpacity
            onPress={handleWhatsAppPress}
            className="bg-green-500 px-6 py-4 rounded-2xl flex-row items-center justify-center mt-4 w-full active:bg-green-600"
          >
            <Ionicons name="logo-whatsapp" size={20} color="white" />
            <Text className="ml-2 font-bold text-white">
              Contact on WhatsApp
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "white", paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />

      <FlashList
        data={paginatedListings}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <ListHeader
            router={router}
            user={user}
            userId={userId}
            profileData={profileData}
            listings={listings}
            connectionsUsers={connectionsUsers}
            connectionStatus={connectionStatus}
            handleSendConnectionRequest={handleSendConnectionRequest}
            handleWhatsAppPress={handleWhatsAppPress}
            handleDisconnect={handleDisconnect}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        }
        numColumns={3}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4F46E5"
          />
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => {
              router.push({
                pathname: "/(dealer)/services/product-feed",
                params: {
                  productId: item.id,
                  initialIndex: index.toString(),
                  from: "profile",
                  userId: userId,
                  t: Date.now().toString(),
                },
            });
            }}
            style={{ width: GRID_ITEM_WIDTH, height: GRID_ITEM_WIDTH }}
            className="border-[0.5px] border-white"
          >
            <Image
              source={{
                uri: getMainImage(item) ?? "https://via.placeholder.com/150",
              }}
              className="w-full h-full bg-gray-50"
              resizeMode="cover"
            />
            {/* Price pill */}
            <View
              style={{
                position: "absolute",
                bottom: 5,
                left: 5,
                backgroundColor: "rgba(0,0,0,0.55)",
                paddingHorizontal: 5,
                paddingVertical: 2,
                borderRadius: 5,
              }}
            >
              <Text style={{ color: "white", fontSize: 9, fontWeight: "700" }}>
                ₹{parseInt(item.price).toLocaleString()}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20 opacity-30">
            <Ionicons name="search-outline" size={64} color="gray" />
            <Text className="font-bold mt-4">No products found</Text>
          </View>
        }
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity
              onPress={() => setVisibleCount((c) => c + PAGE_SIZE)}
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 20,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "#EEF2FF",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1.5,
                  borderColor: "#C7D2FE",
                }}
              >
                <Ionicons name="chevron-down" size={22} color="#4F46E5" />
              </View>
            </TouchableOpacity>
          ) : null
        }
      />

      <DisconnectModal
        visible={disconnectModalVisible}
        onClose={() => setDisconnectModalVisible(false)}
        onConfirm={confirmDisconnect}
      />
    </View>
  );
}

export default UserProfile;