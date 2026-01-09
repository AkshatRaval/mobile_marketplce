import { FeedProductCard } from "@/src/components/FeedProductCard";
import { useAuth } from "@/src/context/AuthContext";
import { useProfileActions } from "@/src/hooks/useProfileActions";
import { useProfileData } from "@/src/hooks/useProfileData";
import { profileApi } from "@/src/services/api/profileApi";
import { getMainImage } from "@/src/utils/helpers";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get("window");
const GRID_ITEM_WIDTH = SCREEN_WIDTH / 3;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

export default function Profile() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // --- DATA FETCHING ---
  // Added 'refetch' from your hook to force updates manually
  const { profileData, listings, connectionsUsers, refetch } = useProfileData(user?.id);
  const { loading, deleteProduct, updateProduct, logout, uploadProfileImage, updatePrivacySettings } = useProfileActions(user?.id, profileData);

  // --- UI & MODAL STATES ---
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedVisible, setFeedVisible] = useState(false);
  const [initialFeedIndex, setInitialFeedIndex] = useState(0);
  const [reelHeight, setReelHeight] = useState(WINDOW_HEIGHT);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isMarkAsSoldVisible, setIsMarkAsSoldVisible] = useState(false);
  const [isSalesLogModalVisible, setIsSalesLogModalVisible] = useState(false);

  // --- FORMS ---
  const [editForm, setEditForm] = useState({ name: "", price: "", description: "" });
  const [saleInfo, setSaleInfo] = useState({ soldPrice: "", buyerName: "", buyerPhone: "", imei: "" });

  // --- DRAWER ---
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [privacySetting, setPrivacySetting] = useState("Everyone");

  // --- SEARCH LOGIC ---
  const filteredListings = useMemo(() => {
    if (!searchQuery.trim()) return listings;
    return listings.filter((item: any) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, listings]);

  useEffect(() => {
    if (profileData?.privacySettings) setPrivacySetting(profileData.privacySettings);
  }, [profileData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const toggleDrawer = (open: boolean) => {
    setIsDrawerVisible(open);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: open ? 0 : DRAWER_WIDTH, duration: 350, easing: Easing.bezier(0.25, 0.1, 0.25, 1), useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: open ? 1 : 0, duration: 350, useNativeDriver: true }),
    ]).start(() => { if (!open) setIsPrivacyOpen(false); });
  };

  // --- HANDLERS ---
  const handleLongPress = (event: any, item: any) => {
    const { pageX, pageY } = event.nativeEvent;
    const x = pageX > SCREEN_WIDTH - 200 ? SCREEN_WIDTH - 210 : pageX;
    const y = pageY > WINDOW_HEIGHT - 200 ? pageY - 180 : pageY;

    setMenuPos({ x, y });
    setSelectedItem(item);
    setEditForm({ name: item.name, price: item.price.toString(), description: item.description });
    setIsMenuVisible(true);
  };

  const handlePickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      await uploadProfileImage(result.assets[0].uri);
      refetch(); // Refresh profile image
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedItem?.id) return;
    const success = await updateProduct(selectedItem.id, editForm);
    if (success) {
      setIsEditModalVisible(false);
      refetch(); // UI Refresh
    }
  };

  const handleFastSale = async () => {
    Alert.alert("Fast Sale", "Mark as sold and remove listing?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark Sold", style: "destructive", onPress: async () => {
          const success = await profileApi.recordSale(selectedItem, { type: 'fast', soldPrice: selectedItem.price });
          if (success) {
            setIsMarkAsSoldVisible(false);
            setIsMenuVisible(false);
            refetch(); // UI Refresh
          }
        }
      }
    ]);
  };

  const submitSalesLog = async () => {
    if (!saleInfo.soldPrice) return Alert.alert("Error", "Sold price is required");
    const success = await profileApi.recordSale(selectedItem, {
      type: 'manual',
      soldPrice: saleInfo.soldPrice,
      buyerName: saleInfo.buyerName,
      buyerPhone: saleInfo.buyerPhone,
      imei: saleInfo.imei
    });
    if (success) {
      setIsSalesLogModalVisible(false);
      setIsMenuVisible(false);
      setSaleInfo({ soldPrice: "", buyerName: "", buyerPhone: "", imei: "" });
      refetch(); // UI Refresh
    }
  };

  const ListHeader = () => (
    <View className="bg-white">
      <View className="flex-row justify-between items-center px-6 pt-4 mb-6">
        <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-[2px]">MY PROFILE</Text>
        <TouchableOpacity onPress={() => toggleDrawer(true)} className="bg-gray-50 p-2.5 rounded-2xl active:bg-gray-200">
          <Ionicons name="menu-outline" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <View className="px-6 flex-row items-center mb-6">
        <TouchableOpacity onPress={handlePickProfileImage} className="relative">
          <Image
            source={{ uri: profileData?.photoURL ?? `https://ui-avatars.com/api/?name=${profileData?.displayName || 'User'}&background=random` }}
            className="w-20 h-20 rounded-full border-4 border-gray-50 mr-5 bg-gray-100"
          />
          <View className="absolute bottom-0 right-4 bg-black p-1.5 rounded-full border-2 border-white">
            <Ionicons name="camera" size={12} color="white" />
          </View>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-2xl font-black text-gray-900 leading-tight">{profileData?.displayName || "Dealer"}</Text>
          <Text className="text-indigo-600 font-bold text-xs uppercase tracking-wider">{profileData?.shopName || "Member"}</Text>
          <View className="flex-row items-center mt-3 gap-6">
            <View><Text className="text-lg font-black">{listings.length}</Text><Text className="text-[9px] font-bold text-gray-400 uppercase">Listings</Text></View>
            <View className="w-[1px] h-6 bg-gray-100" />
            <TouchableOpacity onPress={() => router.push("/(dealer)/services/connections")} className="flex-row items-center">
              <View><Text className="text-lg font-black text-indigo-600">{connectionsUsers.length}</Text><Text className="text-[9px] font-bold text-gray-900 uppercase">Circle</Text></View>
              <Ionicons name="chevron-forward" size={12} color="#4F46E5" className="ml-1" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* SEARCH BAR */}
      <View className="px-6 mb-4">
        <View className="bg-gray-100 flex-row items-center px-4 py-2 rounded-2xl">
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <TextInput
            placeholder="Search your products..."
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

      {connectionsUsers.length > 0 && searchQuery === "" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-6 mb-4">
          {connectionsUsers.map((u, i) => (
            <TouchableOpacity key={i} onPress={() => router.push(`/(dealer)/profile/${u.uid}`)} className="mr-5 items-center">
              <Image source={{ uri: u.photoURL ?? `https://ui-avatars.com/api/?name=${u.displayName}` }} className="w-12 h-12 rounded-full border border-gray-100" />
              <Text className="text-[9px] text-gray-500 mt-1 font-medium">{u.displayName?.split(' ')[0]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <View className="h-[1px] bg-gray-100 w-full" />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "white", paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />

      <FlatList
        data={filteredListings}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => { setInitialFeedIndex(index); setFeedVisible(true); }}
            onLongPress={(e) => handleLongPress(e, item)}
            delayLongPress={300}
            style={{ width: GRID_ITEM_WIDTH, height: GRID_ITEM_WIDTH }}
            className="border-[0.5px] border-white"
          >
            <Image
              source={{ uri: getMainImage(item) ?? 'https://via.placeholder.com/150' }}
              className="w-full h-full bg-gray-50"
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20 opacity-30">
            <Ionicons name="search-outline" size={64} color="gray" />
            <Text className="font-bold mt-4">No products found</Text>
          </View>
        }
      />

      {/* 1. FLOATING DROPDOWN MENU */}
      <Modal visible={isMenuVisible} transparent animationType="fade">
        <Pressable className="flex-1" onPress={() => setIsMenuVisible(false)}>
          <View style={{ position: 'absolute', top: menuPos.y, left: menuPos.x }} className="bg-white w-52 rounded-3xl shadow-2xl border border-gray-100 py-2 overflow-hidden">
            <TouchableOpacity onPress={() => { setIsMenuVisible(false); setIsEditModalVisible(true); }} className="flex-row items-center px-5 py-3.5 active:bg-gray-50">
              <Ionicons name="create-outline" size={18} color="black" /><Text className="ml-4 font-bold text-gray-800">Edit Details</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setIsMenuVisible(false); setIsMarkAsSoldVisible(true); }} className="flex-row items-center px-5 py-3.5 active:bg-indigo-50">
              <Ionicons name="checkmark-done" size={18} color="#4F46E5" /><Text className="ml-4 font-bold text-indigo-600">Mark as Sold</Text>
            </TouchableOpacity>
            <View className="h-[1px] bg-gray-50 mx-4" />
            <TouchableOpacity onPress={() => { setIsMenuVisible(false); deleteProduct(selectedItem?.id, selectedItem?.images); refetch(); }} className="flex-row items-center px-5 py-3.5 active:bg-red-50">
              <Ionicons name="trash-outline" size={18} color="#EF4444" /><Text className="ml-4 font-bold text-red-500">Delete Post</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* 2. MARK AS SOLD CHOICE */}
      <Modal visible={isMarkAsSoldVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-[40px] p-8 pb-12">
            <View className="w-12 h-1 bg-gray-200 rounded-full self-center mb-8" />
            <Text className="text-2xl font-black text-center mb-8">Mark as Sold</Text>
            <View className="flex-row gap-4">
              <TouchableOpacity onPress={handleFastSale} className="flex-1 bg-gray-50 p-6 rounded-[32px] items-center">
                <Ionicons name="flash-outline" size={32} color="black" />
                <Text className="font-black mt-3 text-xs uppercase">Fast Sale</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setIsMarkAsSoldVisible(false); setIsSalesLogModalVisible(true); }} className="flex-1 bg-indigo-600 p-6 rounded-[32px] items-center">
                <Ionicons name="receipt-outline" size={32} color="white" />
                <Text className="font-black text-white mt-3 text-xs uppercase">Save Logs</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setIsMarkAsSoldVisible(false)} className="mt-8 items-center"><Text className="text-gray-400 font-bold">Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 3. SALES LOG MODAL */}
      <Modal visible={isSalesLogModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-[48px] p-8 pb-10">
            <Text className="text-2xl font-black mb-6">Sale Information</Text>
            <ScrollView showsVerticalScrollIndicator={false} className="space-y-4">
              <TextInput placeholder="Final Sale Price (₹)" keyboardType="numeric" className="bg-gray-100 p-5 rounded-2xl font-bold" value={saleInfo.soldPrice} onChangeText={(t) => setSaleInfo({ ...saleInfo, soldPrice: t })} />
              <TextInput placeholder="Customer Name" className="bg-gray-100 p-5 rounded-2xl font-bold" value={saleInfo.buyerName} onChangeText={(t) => setSaleInfo({ ...saleInfo, buyerName: t })} />
              <TextInput placeholder="Customer Phone" keyboardType="phone-pad" className="bg-gray-100 p-5 rounded-2xl font-bold" value={saleInfo.buyerPhone} onChangeText={(t) => setSaleInfo({ ...saleInfo, buyerPhone: t })} />
              <TextInput placeholder="IMEI (Optional)" className="bg-gray-100 p-5 rounded-2xl font-bold" value={saleInfo.imei} onChangeText={(t) => setSaleInfo({ ...saleInfo, imei: t })} />
              <TouchableOpacity onPress={submitSalesLog} className="bg-black py-5 rounded-2xl items-center mt-6"><Text className="text-white font-black">Complete Record</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setIsSalesLogModalVisible(false)} className="py-4 items-center"><Text className="text-gray-400 font-bold">Go Back</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 4. DRAWER */}
      <Modal visible={isDrawerVisible} transparent animationType="none">
        <View className="flex-1">
          <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", opacity: fadeAnim }}>
            <Pressable className="flex-1" onPress={() => toggleDrawer(false)} />
          </Animated.View>
          <Animated.View style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: DRAWER_WIDTH, backgroundColor: "white", paddingTop: insets.top + 20, paddingHorizontal: 28, transform: [{ translateX: slideAnim }] }}>
            <Text className="text-3xl font-black mb-10 mt-4">Menu</Text>
            <TouchableOpacity onPress={() => { toggleDrawer(false); router.push("/services/sales-logs"); }} className="flex-row items-center py-5 border-b border-gray-100 active:opacity-60"><Ionicons name="bar-chart-outline" size={22} color="black" /><Text className="ml-4 font-bold text-lg">Sales Analytics</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { LayoutAnimation.easeInEaseOut(); setIsPrivacyOpen(!isPrivacyOpen); }} className="flex-row items-center justify-between py-5 border-b border-gray-100">
              <View className="flex-row items-center"><Ionicons name="shield-checkmark-outline" size={22} color="black" /><Text className="ml-4 font-bold text-lg">Privacy</Text></View>
              <Ionicons name={isPrivacyOpen ? "chevron-up" : "chevron-down"} size={16} color="gray" />
            </TouchableOpacity>
            {isPrivacyOpen && (
              <View className="bg-gray-50 rounded-3xl p-3 mt-3">
                {["Everyone", "Connections only"].map((opt) => (
                  <TouchableOpacity key={opt} onPress={() => { updatePrivacySettings(opt); refetch(); }} className="p-4 flex-row justify-between items-center active:bg-white rounded-2xl">
                    <Text className={privacySetting === opt ? "text-indigo-600 font-bold" : "text-gray-500"}>{opt}</Text>
                    {privacySetting === opt && <Ionicons name="checkmark-circle" size={18} color="#4F46E5" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TouchableOpacity onPress={logout} className="flex-row items-center py-5 mt-auto mb-10"><Ionicons name="log-out-outline" size={22} color="#EF4444" /><Text className="ml-4 font-bold text-lg text-red-500">Sign Out</Text></TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* 5. FEED MODAL */}
      <Modal visible={feedVisible} animationType="slide">
        <View className="flex-1 bg-black" onLayout={(e) => setReelHeight(e.nativeEvent.layout.height)}>
          <FlatList
            data={filteredListings}
            keyExtractor={(item) => item.id}
            pagingEnabled
            snapToInterval={reelHeight}
            decelerationRate="fast"
            initialScrollIndex={initialFeedIndex}
            getItemLayout={(data, index) => ({ length: reelHeight, offset: reelHeight * index, index })}
            renderItem={({ item }) => (
              <FeedProductCard
                item={item}
                height={reelHeight}
                onClose={() => setFeedVisible(false)}
                onPressOptions={() => handleLongPress({ nativeEvent: { pageX: SCREEN_WIDTH / 2, pageY: WINDOW_HEIGHT / 2 } }, item)}
              />
            )}
          />
        </View>
      </Modal>

      {/* 6. EDIT MODAL */}
      <Modal visible={isEditModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center px-6">
          <View className="bg-white rounded-[40px] p-8">
            <Text className="text-xl font-black mb-6">Edit Listing</Text>
            <TextInput value={editForm.name} onChangeText={(t) => setEditForm({ ...editForm, name: t })} className="bg-gray-100 p-5 rounded-2xl font-bold mb-4" placeholder="Name" />
            <TextInput value={editForm.price} onChangeText={(t) => setEditForm({ ...editForm, price: t })} keyboardType="numeric" className="bg-gray-100 p-5 rounded-2xl font-bold mb-4" placeholder="Price" />
            <TextInput value={editForm.description} onChangeText={(t) => setEditForm({ ...editForm, description: t })} multiline className="bg-gray-100 p-5 rounded-2xl font-medium mb-8 min-h-[100px]" placeholder="Description" />
            <View className="flex-row gap-4">
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)} className="flex-1 bg-gray-100 py-4 rounded-2xl items-center"><Text className="font-bold text-gray-500">Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveEdit} className="flex-1 bg-black py-4 rounded-2xl items-center">
                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}