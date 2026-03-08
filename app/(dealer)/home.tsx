import { ProductCard } from "@/src/components/ProductCard";
import { SkeletonList } from "@/src/components/Skeleton";
import { useAuth } from "@/src/context/AuthContext";
import { useTabRefresh } from "@/src/context/TabelRefreshContext";
import { useAcceptedConnections } from "@/src/hooks/useAcceptedConnections";
import { useConnectionRequests } from "@/src/hooks/useConnectionRequests";
import { useProducts } from "@/src/hooks/useProducts";
import type { Product } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  LogBox,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// import ImageView from "react-native-image-viewing";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

LogBox.ignoreLogs([
  "[Reanimated] Reading from `value` during component render",
  "[Reanimated] Writing to `value` during component render",
]);

type TabType = "all" | "connections";

let ImageView: any = null;

if (Platform.OS !== "web") {
  ImageView = require("react-native-image-viewing").default;
}

export default function DealerHome() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { subscribeToRefresh } = useTabRefresh();

  // FlashList ref for scrolling to top
  const flatListRef = React.useRef<FlashListRef<Product>>(null);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<TabType>("all");

  // Product Fetching
  const { products, loading: productsLoading, loadingMore, refetch, loadMore } = useProducts();

  // Accepted Connections
  const { connectionIds, loading: connectionsLoading } = useAcceptedConnections(
    user?.id
  );

  // Connection Requests
  const {
    requestUsers,
    loading: requestsLoading,
    acceptRequest,
    rejectRequest,
    refetch: refetchRequests,
  } = useConnectionRequests(user?.id);

  // Local UI state
  const [isNotifVisible, setIsNotifVisible] = useState(false);
  const [notifRefreshing, setNotifRefreshing] = useState(false);
  const [viewerData, setViewerData] = useState({
    visible: false,
    images: [] as { uri: string }[],
    index: 0,
  });

  // Subscribe to double-tap refresh events
  useEffect(() => {
    const unsubscribe = subscribeToRefresh("home", () => {
      // // console.log("🔄 Refreshing Home feed & scrolling to top...");

      // Scroll to top with animation
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

      // Refresh data
      refetch();
    });

    return unsubscribe;
  }, [subscribeToRefresh, refetch]);

  // Layout calculations
  const HEADER_HEIGHT = 60;
  const TAB_BAR_HEIGHT = 60;
  const REEL_HEIGHT =
    Dimensions.get("window").height -
    HEADER_HEIGHT -
    TAB_BAR_HEIGHT -
    insets.top -
    insets.bottom;

  // Sorted Products (All)
  const sortedProducts = useMemo(() => {
    if (!products) return [];
    return [...products].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [products]);

  // Filtered Products (Connections Only)
  const connectionsProducts = useMemo(() => {
    if (!connectionIds.length) return [];
    return sortedProducts.filter((product) =>
      connectionIds.includes(product.userId)
    );
  }, [sortedProducts, connectionIds]);

  // Display Products based on active tab
  const displayProducts =
    activeTab === "all" ? sortedProducts : connectionsProducts;

  const handleProfilePress = useCallback(
    (uid: string) => {
      // console.log("🔍 Profile clicked:");
      // console.log("  - Clicked UID:", uid);
      // console.log("  - Current User ID:", user?.id);
      // console.log("  - Is same user?", uid === user?.id);

      if (!uid) {
        // console.log("  ❌ No UID provided");
        return;
      }

      // If it's the current user's profile, navigate to their own profile page
      if (uid === user?.id) {
        // console.log("  ➡️ Navigating to own profile");
        router.push("/(dealer)/profile");
      } else {
        // console.log("  ➡️ Navigating to other user's profile:", `/(dealer)/profile/${uid}`);
        router.push(`/(dealer)/profile/${uid}`);
      }
    },
    [router, user?.id]
  );

  const handleImagePress = useCallback((images: string[], index: number) => {
    setViewerData({
      visible: true,
      images: images.map((uri) => ({ uri })),
      index,
    });
  }, []);

  const renderProductItem = useCallback(
    ({ item }: { item: Product }) => {
      return (
        <ProductCard
          item={item}
          height={REEL_HEIGHT}
          onPressProfile={handleProfilePress}
          onPressImage={handleImagePress}
        />
      );
    },
    [REEL_HEIGHT, handleProfilePress, handleImagePress]
  );

  // Notification modal refresh handler
  const handleNotificationRefresh = useCallback(async () => {
    setNotifRefreshing(true);
    await refetchRequests();
    setNotifRefreshing(false);
  }, [refetchRequests]);

  const isLoading = productsLoading || connectionsLoading;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      {/* HEADER WITH TABS & NOTIFICATION */}
      <View
        className="px-4 bg-white border-b border-gray-100 flex-row items-center justify-between"
        style={{ height: HEADER_HEIGHT }}
      >
        {/* TABS */}
        <View className="flex-row flex-1 gap-1">
          <TouchableOpacity
            onPress={() => setActiveTab("all")}
            className={`px-5 py-2.5 rounded-full ${activeTab === "all" ? "bg-black" : "bg-gray-50"
              }`}
          >
            <Text
              className={`font-bold text-sm ${activeTab === "all" ? "text-white" : "text-gray-600"
                }`}
            >
              All Feed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("connections")}
            className={`px-5 py-2.5 rounded-full ${activeTab === "connections" ? "bg-black" : "bg-gray-50"
              }`}
          >
            <Text
              className={`font-bold text-sm ${activeTab === "connections" ? "text-white" : "text-gray-600"
                }`}
            >
              Connections
            </Text>
          </TouchableOpacity>
        </View>

        {/* NOTIFICATION BUTTON */}
        <TouchableOpacity
          onPress={() => setIsNotifVisible(true)}
          className="bg-gray-100 h-10 w-10 rounded-full items-center justify-center relative ml-2"
        >
          <Ionicons name="notifications-outline" size={22} color="black" />

          {requestUsers.length > 0 && (
            <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
          )}
        </TouchableOpacity>
      </View>
      {/* FEED */}
      {isLoading && displayProducts.length === 0 ? (
        <SkeletonList count={3} type="feed" feedHeight={REEL_HEIGHT} />
      ) : displayProducts.length === 0 ? (
        <View className="flex-1 justify-center items-center opacity-50 px-10">
          <Ionicons name="cube-outline" size={64} color="gray" />
          <Text className="font-bold mt-4 text-center text-gray-500">
            {activeTab === "connections"
              ? "No posts from your connections yet."
              : "No listings found."}
          </Text>
          <TouchableOpacity
            onPress={refetch}
            className="mt-4 bg-gray-200 px-4 py-2 rounded-full"
          >
            <Text className="text-xs font-bold">Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          ref={flatListRef}
          data={displayProducts}
          keyExtractor={(item) => item.id}
          pagingEnabled
          snapToInterval={REEL_HEIGHT}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 0 }}
          renderItem={renderProductItem}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
          extraData={activeTab}
          onEndReached={activeTab === "all" ? loadMore : undefined}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#4F46E5" />
              </View>
            ) : null
          }
        />
      )}
      {/* GLOBAL IMAGE VIEWER */}
      {ImageView && (
        <ImageView
          images={viewerData.images}
          imageIndex={viewerData.index}
          visible={viewerData.visible}
          onRequestClose={() =>
            setViewerData((prev) => ({ ...prev, visible: false }))
          }
        />
      )}
      {/* NOTIFICATIONS MODAL */}
      <Modal
        visible={isNotifVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsNotifVisible(false)}
      >
        <Pressable
          onPress={() => setIsNotifVisible(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <Pressable className="bg-white rounded-t-3xl h-[60%] overflow-hidden">
            {/* MODAL HEADER */}
            <View className="flex-row justify-between items-center p-6 border-b border-gray-100">
              <Text className="text-xl font-black text-gray-900">
                Notifications
              </Text>
              <TouchableOpacity
                onPress={() => setIsNotifVisible(false)}
                className="bg-gray-100 p-2 rounded-full"
              >
                <Ionicons name="close" size={20} color="black" />
              </TouchableOpacity>
            </View>

            {/* EMPTY STATE */}
            {requestUsers.length === 0 ? (
              <View className="flex-1 justify-center items-center opacity-40">
                <Ionicons
                  name="notifications-off-outline"
                  size={48}
                  color="gray"
                />
                <Text className="mt-4 font-bold text-gray-500">
                  No new requests
                </Text>
              </View>
            ) : (
              /* REQUEST LIST */
              <FlashList
                data={requestUsers}
                keyExtractor={(item) => item.uid}
                contentContainerStyle={{ padding: 24 }}
                refreshControl={
                  <RefreshControl
                    refreshing={notifRefreshing}
                    onRefresh={handleNotificationRefresh}
                    tintColor="#4F46E5"
                    colors={["#4F46E5"]}
                  />
                }
                renderItem={({ item }) => (
                  <View className="flex-row items-center mb-6">
                    <Image
                      source={{
                        uri:
                          item.photoURL ||
                          `https://ui-avatars.com/api/?name=${item.displayName}`,
                      }}
                      className="w-12 h-12 rounded-full border border-gray-100"
                    />
                    <View className="flex-1 ml-3">
                      <Text className="font-bold text-base text-gray-900">
                        {item.displayName}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        wants to join your circle
                      </Text>
                    </View>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => rejectRequest(item.uid)}
                        className="bg-gray-100 px-4 py-2 rounded-lg"
                      >
                        <Text className="font-bold text-gray-600 text-xs">
                          Delete
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => acceptRequest(item.uid)}
                        className="bg-black px-4 py-2 rounded-lg flex-row items-center"
                      >
                        <Text className="font-bold text-white text-xs">
                          Confirm
                        </Text>
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