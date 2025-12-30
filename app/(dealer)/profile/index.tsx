import { FeedProductCard } from "@/src/components/FeedProductCard";
import { useAuth } from "@/src/context/AuthContext";
import { useProfileActions } from "@/src/hooks/useProfileActions";
import { useProfileData } from "@/src/hooks/useProfileData";
import { getMainImage } from "@/src/utils/helpers";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// CONSTANTS
const { width: SCREEN_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get("window");
const GRID_ITEM_WIDTH = SCREEN_WIDTH / 3;

export default function Profile() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ✅ ALL DATA FETCHING IN HOOK
  const { profileData, listings, connectionsUsers } = useProfileData(user?.uid);

  // ✅ ALL ACTIONS IN HOOK
  const { loading, deleteProduct, updateProduct, logout } = useProfileActions(
    user?.uid,
    profileData
  );

  // UI STATE ONLY
  const [feedVisible, setFeedVisible] = useState(false);
  const [initialFeedIndex, setInitialFeedIndex] = useState(0);
  const [reelHeight, setReelHeight] = useState(WINDOW_HEIGHT);

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const openFeedAtIndex = (index: number) => {
    setInitialFeedIndex(index);
    setFeedVisible(true);
  };

  const handleOpenOptions = (item: any) => {
    setSelectedItem(item);
    setEditName(item.name);
    setEditPrice(item.price);
    setEditDescription(item.description);
    setIsOptionsVisible(true);
  };

  const handleDeleteListing = async () => {
    if (!selectedItem) return;
    const productImages = selectedItem.images || [];
    const success = await deleteProduct(selectedItem.id, productImages);
    
    if (success) {
      setIsOptionsVisible(false);
      if (listings.length <= 1) {
        setFeedVisible(false);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    const success = await updateProduct(selectedItem.id, {
      name: editName,
      price: editPrice,
      description: editDescription,
    });

    if (success) {
      setIsEditModalVisible(false);
      setIsOptionsVisible(false);
    }
  };

  // ========================================
  // UI ONLY FROM HERE
  // ========================================

  const ListHeader = () => (
    <View className="bg-white pb-4 border-b border-gray-100 mb-0.5">
      <View className="flex-row justify-between items-center px-6 pt-2 mb-6">
        <Text className="text-gray-400 font-bold text-xs uppercase tracking-widest">
          MY PROFILE
        </Text>

        <TouchableOpacity
          onPress={logout}
          className="bg-gray-50 p-2 rounded-full"
        >
          <Ionicons name="ellipsis-vertical" size={20} color="black" />
        </TouchableOpacity>
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
            <View>
              <Text className="text-lg font-black text-gray-900 leading-tight">
                {listings.length}
              </Text>
              <Text className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                Listings
              </Text>
            </View>

            <View className="w-[1px] h-6 bg-gray-200" />

            <TouchableOpacity
              onPress={() => router.push("/(dealer)/services/connections")}
              className="flex-row items-center"
            >
              <View>
                <Text className="text-lg font-black text-indigo-600 leading-tight">
                  {connectionsUsers.length}
                </Text>
                <Text className="text-[9px] font-bold text-gray-900 uppercase tracking-widest">
                  Circle
                </Text>
              </View>
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
            // ✅ CRITICAL FIX: Fallback key extractor ensures no crash if uid is missing
            keyExtractor={(item, index) => item.uid || String(index)}
            renderItem={({ item }) => (
              <TouchableOpacity
                // ✅ Safety Check: Only navigate if UID exists
                onPress={() => item.uid && router.push(`/(dealer)/profile/${item.uid}`)}
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

      {/* GRID VIEW */}
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

      {/* FEED MODAL */}
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
                onPressOptions={() => handleOpenOptions(item)}
              />
            )}
          />
        </View>
      </Modal>

      {/* OPTIONS DROPDOWN */}
      {isOptionsVisible && (
        <Modal transparent animationType="fade" visible={isOptionsVisible}>
          <Pressable
            onPress={() => setIsOptionsVisible(false)}
            className="flex-1 relative"
          >
            <View
              className="absolute bottom-24 right-5 bg-white w-48 rounded-xl shadow-2xl overflow-hidden py-2"
              style={{ elevation: 10 }}
            >
              <TouchableOpacity
                onPress={() => {
                  setIsOptionsVisible(false);
                  setIsEditModalVisible(true);
                }}
                className="flex-row items-center px-4 py-3 active:bg-gray-100"
              >
                <Ionicons name="create-outline" size={20} color="#333" />
                <Text className="ml-3 font-bold text-gray-800">Edit Post</Text>
              </TouchableOpacity>

              <View className="h-[1px] bg-gray-100 mx-4" />

              <TouchableOpacity
                onPress={handleDeleteListing}
                disabled={loading}
                className="flex-row items-center px-4 py-3 active:bg-gray-100"
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                <Text className="ml-3 font-bold text-red-500">Delete Post</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* EDIT MODAL */}
      <Modal visible={isEditModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/80 justify-center items-center px-6">
          <View className="bg-white w-full rounded-3xl p-6 max-h-[80%]">
            <Text className="text-xl font-black text-center mb-6">
              Edit Listing
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-gray-500 font-bold mb-1 ml-1 text-xs uppercase">
                Product Name
              </Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                className="bg-gray-100 p-4 rounded-xl font-bold mb-4"
                placeholder="Product Name"
              />

              <Text className="text-gray-500 font-bold mb-1 ml-1 text-xs uppercase">
                Price (₹)
              </Text>
              <TextInput
                value={editPrice}
                onChangeText={setEditPrice}
                keyboardType="numeric"
                className="bg-gray-100 p-4 rounded-xl font-bold mb-4"
                placeholder="Price"
              />

              <Text className="text-gray-500 font-bold mb-1 ml-1 text-xs uppercase">
                Description
              </Text>
              <TextInput
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="bg-gray-100 p-4 rounded-xl font-medium mb-6 min-h-[100px]"
                placeholder="Description"
              />
            </ScrollView>

            <View className="flex-row gap-4 mt-2">
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                className="flex-1 bg-gray-200 py-3 rounded-xl items-center"
              >
                <Text className="font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={loading}
                className="flex-1 bg-black py-3 rounded-xl items-center"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold">Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}