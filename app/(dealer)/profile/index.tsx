import { FeedProductCard } from "@/src/components/FeedProductCard";
import { useAuth } from "@/src/context/AuthContext";
import { useProfileActions } from "@/src/hooks/useProfileActions";
import { useProfileData } from "@/src/hooks/useProfileData";
import { getMainImage } from "@/src/utils/helpers";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// CONSTANTS
const { width: SCREEN_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get("window");
const GRID_ITEM_WIDTH = SCREEN_WIDTH / 3;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75; // Drawer takes 75% of width

export default function Profile() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // DATA FETCHING
  const { profileData, listings, connectionsUsers } = useProfileData(user?.id);

  // ACTIONS (Backend Connected)
  const {
    loading,
    deleteProduct,
    updateProduct,
    logout,
    uploadProfileImage,
    updatePrivacySettings,
  } = useProfileActions(user?.id, profileData);

  // UI STATE
  const [feedVisible, setFeedVisible] = useState(false);
  const [initialFeedIndex, setInitialFeedIndex] = useState(0);
  const [reelHeight, setReelHeight] = useState(WINDOW_HEIGHT);

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // ✨ DRAWER STATE & ANIMATIONS
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  
  // Animation Values
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current; // For Drawer Slide
  const fadeAnim = useRef(new Animated.Value(0)).current; // For Backdrop Fade

  // Privacy State
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [privacySetting, setPrivacySetting] = useState("Everyone");

  // ✅ SYNC Privacy Setting with DB data
  useEffect(() => {
    if (profileData?.privacySettings) {
      setPrivacySetting(profileData.privacySettings);
    }
  }, [profileData]);

  // ========================================
  // ANIMATION LOGIC (Smoother)
  // ========================================

  const openDrawer = () => {
    setIsDrawerVisible(true);
    // Run Slide and Fade in parallel
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic), // Smooth "out" easing
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: DRAWER_WIDTH,
        duration: 350,
        easing: Easing.in(Easing.cubic), // Smooth "in" easing
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsDrawerVisible(false);
      setIsPrivacyOpen(false); // Reset accordion
    });
  };

  const togglePrivacy = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsPrivacyOpen(!isPrivacyOpen);
  };

  // ========================================
  // BACKEND ACTIONS
  // ========================================

  const handlePickProfileImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Lower quality for faster upload
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        // ✅ Call backend action
        await uploadProfileImage(uri);
      }
    } catch (error) {
      console.log("Error picking image:", error);
    }
  };

  const handlePrivacyChange = async (option: string) => {
    setPrivacySetting(option); // Optimistic UI update
    await updatePrivacySettings(option); // Backend update
  };

  // ========================================
  // FEED ACTIONS
  // ========================================

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

  const ListHeader = () => (
    <View className="bg-white pb-4 border-b border-gray-100 mb-0.5">
      <View className="flex-row justify-between items-center px-6 pt-2 mb-6">
        <Text className="text-gray-400 font-bold text-xs uppercase tracking-widest">
          MY PROFILE
        </Text>

        <TouchableOpacity
          onPress={openDrawer}
          className="bg-gray-50 p-2 rounded-full active:bg-gray-200"
        >
          <Ionicons name="menu" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <View className="px-6 flex-row items-center mb-6">
        <TouchableOpacity 
          onPress={handlePickProfileImage} 
          disabled={loading}
          className="relative"
        >
          {loading ? (
             <View className="w-20 h-20 rounded-full border-4 border-gray-50 mr-5 justify-center items-center bg-gray-100">
                <ActivityIndicator size="small" color="#000" />
             </View>
          ) : (
            <Image
              source={{
                uri:
                  profileData?.photoURL ||
                  `https://ui-avatars.com/api/?name=${profileData?.displayName}`,
              }}
              className="w-20 h-20 rounded-full border-4 border-gray-50 mr-5"
            />
          )}
          
          {!loading && (
            <View className="absolute bottom-0 right-4 bg-black p-1.5 rounded-full border-2 border-white">
              <Ionicons name="camera" size={12} color="white" />
            </View>
          )}
        </TouchableOpacity>

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
            keyExtractor={(item, index) => item.uid || String(index)}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() =>
                  item.uid && router.push(`/(dealer)/profile/${item.uid}`)
                }
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
    <View
      style={{ flex: 1, backgroundColor: "white", paddingTop: insets.top }}
    >
      <StatusBar barStyle="dark-content" />

      {/* LIST OF PRODUCTS */}
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

      {/* ✨ ANIMATED DRAWER MODAL */}
      <Modal
        visible={isDrawerVisible}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
      >
        <View className="flex-1">
          {/* 1. Backdrop (Fades In/Out) */}
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
              opacity: fadeAnim, // ✨ FADE ANIMATION
            }}
          >
            <Pressable className="flex-1" onPress={closeDrawer} />
          </Animated.View>

          {/* 2. Drawer Content (Slides In/Out) */}
          <Animated.View
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: DRAWER_WIDTH,
              backgroundColor: "white",
              paddingTop: insets.top + 20,
              paddingHorizontal: 24,
              shadowColor: "#000",
              shadowOffset: { width: -5, height: 0 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 20,
              transform: [{ translateX: slideAnim }], // ✨ SLIDE ANIMATION
            }}
          >
            <Text className="text-2xl font-black text-gray-900 mb-8 mt-4">
              Settings
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Sales Logs */}
              <TouchableOpacity
                onPress={() => {
                  closeDrawer();
                  router.push("/services/sales-logs"); 
                }}
                className="flex-row items-center py-4 border-b border-gray-100 active:opacity-70"
              >
                <View className="w-8">
                  <Ionicons name="bar-chart-outline" size={22} color="black" />
                </View>
                <Text className="text-base font-bold text-gray-800">
                  Sales Logs
                </Text>
              </TouchableOpacity>

              {/* Privacy Accordion */}
              <TouchableOpacity
                onPress={togglePrivacy}
                className="flex-row items-center justify-between py-4 border-b border-gray-100 active:opacity-70"
              >
                <View className="flex-row items-center">
                  <View className="w-8">
                    <Ionicons name="lock-closed-outline" size={22} color="black" />
                  </View>
                  <Text className="text-base font-bold text-gray-800">
                    Privacy
                  </Text>
                </View>
                <Ionicons
                  name={isPrivacyOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="gray"
                />
              </TouchableOpacity>

              {/* Privacy Options */}
              {isPrivacyOpen && (
                <View className="bg-gray-50 rounded-lg p-2 mb-2">
                  {[
                    "Everyone",
                    "No one",
                    "Connections only",
                    "Selected connections",
                  ].map((option) => (
                    <TouchableOpacity
                      key={option}
                      onPress={() => handlePrivacyChange(option)}
                      className="flex-row items-center justify-between p-3 active:bg-gray-200 rounded-md"
                    >
                      <Text
                        className={`text-sm font-medium ${
                          privacySetting === option
                            ? "text-indigo-600"
                            : "text-gray-500"
                        }`}
                      >
                        {option}
                      </Text>
                      {privacySetting === option && (
                        <Ionicons name="checkmark" size={16} color="#4F46E5" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Logout */}
              <TouchableOpacity
                onPress={logout}
                className="flex-row items-center py-4 mt-4 active:opacity-70"
              >
                <View className="w-8">
                  <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                </View>
                <Text className="text-base font-bold text-red-500">
                  Log Out
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* FEED MODAL (UNCHANGED) */}
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

      {/* OPTIONS & EDIT MODALS (UNCHANGED) */}
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