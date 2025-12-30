import { useAuth } from "@/src/context/AuthContext";
import { publicProfileApi } from "@/src/services/api/publicProfileApi"; // ✅ Import the API
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MyConnections() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ NEW: Fetch logic uses the separate collection API
  const fetchConnections = async () => {
    if (!user?.uid) return;

    try {
      if (!refreshing) setLoading(true);
      const connectionsData = await publicProfileApi.fetchDealerConnections(user.uid);
      
      setUsers(connectionsData || []);
    } catch (error) {
      console.error("Error fetching connections:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [user?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConnections();
  };

  const handleCall = (phone: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB", paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />

      {/* Modern Header */}
      <View className="px-6 py-5 bg-white flex-row items-center justify-between border-b border-gray-100 shadow-sm z-10">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 bg-gray-50 p-2 rounded-full">
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-2xl font-black text-gray-900 tracking-tight">My Circle</Text>
        </View>
        <View className="bg-indigo-50 px-3 py-1 rounded-full">
          <Text className="text-indigo-700 font-bold text-xs">{users.length} Connected</Text>
        </View>
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : users.length === 0 ? (
        <View className="flex-1 justify-center items-center opacity-50">
          <Ionicons name="people-outline" size={80} color="#9CA3AF" />
          <Text className="font-bold mt-4 text-gray-400 text-lg">No connections yet</Text>
          <TouchableOpacity onPress={onRefresh} className="mt-4">
            <Text className="text-indigo-600 font-bold">Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4F46E5"]} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/(dealer)/profile/${item.uid}`)}
              className="flex-row items-center bg-white mb-4 p-4 rounded-3xl border border-gray-100 shadow-sm active:scale-[0.98]"
            >
              {/* Avatar */}
              <Image
                source={{
                  uri: item.photoURL || `https://ui-avatars.com/api/?name=${item.displayName}`,
                }}
                className="w-16 h-16 rounded-2xl border border-gray-100"
              />

              {/* Info */}
              <View className="flex-1 ml-4 justify-center">
                <Text className="font-bold text-lg text-gray-900 leading-tight">
                  {item.displayName}
                </Text>
                <Text className="text-indigo-600 font-bold text-xs uppercase tracking-wider mt-1">
                  {item.shopName || "Verified Dealer"}
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="flex-row items-center gap-2">
                {item.phoneNumber && (
                  <TouchableOpacity
                    onPress={() => handleCall(item.phoneNumber)}
                    className="w-10 h-10 bg-green-50 rounded-full items-center justify-center border border-green-100"
                  >
                    <Ionicons name="call" size={18} color="#16A34A" />
                  </TouchableOpacity>
                )}
                <View className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100">
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}