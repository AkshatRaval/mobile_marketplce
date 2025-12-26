import { db } from "@/FirebaseConfig";
import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, documentId, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MyConnections() {
  const { userDoc } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const connectionIds = userDoc?.connections || [];
    
    if (connectionIds.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    // Firestore 'in' query supports max 10. 
    // We slice to first 10 for safety in this demo.
    // For a real app with >10 connections, you would need to fetch in batches.
    const safeIds = connectionIds.slice(0, 10);
    
    const q = query(
      collection(db, "users"), 
      where(documentId(), "in", safeIds)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const fetchedUsers = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
      setUsers(fetchedUsers);
      setLoading(false);
    });

    return () => unsub();
  }, [userDoc?.connections]);

  return (
    <View style={{ flex: 1, backgroundColor: "white", paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-xl font-black">My Circle</Text>
      </View>

      {/* List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="black" />
        </View>
      ) : users.length === 0 ? (
        <View className="flex-1 justify-center items-center opacity-40">
          <Ionicons name="people-outline" size={64} color="gray" />
          <Text className="font-bold mt-4">Your circle is empty</Text>
        </View>
      ) : (
        <FlatList 
          data={users}
          keyExtractor={item => item.uid}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              onPress={() => router.push(`/(dealer)/profile/${item.uid}`)}
              className="flex-row items-center bg-white mb-4 p-4 rounded-2xl border border-gray-100 shadow-sm"
            >
              <Image 
                source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${item.displayName}` }} 
                className="w-14 h-14 rounded-full border border-gray-200" 
              />
              <View className="flex-1 ml-4">
                <Text className="font-bold text-base text-gray-900">{item.displayName}</Text>
                <Text className="text-indigo-600 font-bold text-xs">{item.shopName || "Verified Dealer"}</Text>
                <Text className="text-gray-400 text-xs">{item.city || "Online"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}