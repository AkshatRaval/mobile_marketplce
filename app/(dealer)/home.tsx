// app/(dealer)/home.tsx (or wherever your Home file is)

import { ProductCard } from "@/src/components/ProductCard";
import { useAuth } from "@/src/context/AuthContext";
import { useConnectionRequests } from "@/src/hooks/useConnectionRequests";
import { useProducts } from "@/src/hooks/useProducts";
import type { Product } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  LogBox,
  Modal,
  Pressable,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ImageView from "react-native-image-viewing";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// Suppress Reanimated warnings
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

LogBox.ignoreLogs([
  "[Reanimated] Reading from `value` during component render",
  "[Reanimated] Writing to `value` during component render",
]);

export default function DealerHome() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ✅ Product Fetching
  const { products, loading: productsLoading, refetch } = useProducts();

  // ✅ Connection Requests (FIXED: No longer needs userDoc args)
  const {
    requestUsers,
    loading: requestsLoading,
    acceptRequest,
    rejectRequest,
  } = useConnectionRequests(user?.id);

  // Local UI state
  const [isNotifVisible, setIsNotifVisible] = useState(false);
  const [viewerData, setViewerData] = useState({
    visible: false,
    images: [] as { uri: string }[],
    index: 0,
  });

  // Layout calculations
  const HEADER_HEIGHT = 60;
  const TAB_BAR_HEIGHT = 60;
  const REEL_HEIGHT =
    Dimensions.get("window").height -
    HEADER_HEIGHT -
    TAB_BAR_HEIGHT -
    insets.top -
    insets.bottom;

  const handleProfilePress = useCallback(
    (uid: string) => {
      if (!uid) return;
      router.push(`/profile/${uid}`); // Ensure this route matches your file structure
    },
    [router]
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

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View
        className="px-4 bg-white border-b border-gray-100 flex-row items-center justify-between"
        style={{ height: HEADER_HEIGHT }}
      >
        <Text className="text-xl font-black text-black italic">FEED</Text>

        <TouchableOpacity
          onPress={() => setIsNotifVisible(true)}
          className="bg-gray-100 h-10 w-10 rounded-full items-center justify-center relative"
        >
          <Ionicons name="notifications-outline" size={22} color="black" />
          
          {/* FIXED: Uses requestUsers.length directly */}
          {requestUsers.length > 0 && (
            <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
          )}
        </TouchableOpacity>
      </View>

      {/* FEED */}
      {products.length === 0 && !productsLoading ? (
        <View className="flex-1 justify-center items-center opacity-50 px-10">
          <Ionicons name="cube-outline" size={64} color="gray" />
          <Text className="font-bold mt-4 text-center text-gray-500">
            No listings found.
          </Text>
          <TouchableOpacity
            onPress={refetch}
            className="mt-4 bg-gray-200 px-4 py-2 rounded-full"
          >
            <Text className="text-xs font-bold">Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          pagingEnabled
          snapToInterval={REEL_HEIGHT}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 0 }}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={3}
          renderItem={renderProductItem}
          refreshControl={
            <RefreshControl refreshing={productsLoading} onRefresh={refetch} />
          }
        />
      )}

      {/* GLOBAL IMAGE VIEWER */}
      <ImageView
        images={viewerData.images}
        imageIndex={viewerData.index}
        visible={viewerData.visible}
        onRequestClose={() =>
          setViewerData((prev) => ({ ...prev, visible: false }))
        }
      />

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
              <FlatList
                data={requestUsers}
                keyExtractor={(item) => item.uid}
                contentContainerStyle={{ padding: 24 }}
                // FIXED: Removed refreshControl because the hook is real-time
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