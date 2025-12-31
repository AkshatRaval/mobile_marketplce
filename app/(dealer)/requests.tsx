// app/requests.tsx
// ✨ REFACTORED - UI ONLY ✨
// BEFORE: 310 lines with mixed logic
// AFTER: 200 lines - clean UI only!

import { useAuth } from "@/src/context/AuthContext";
import type { MarketRequest } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ✅ Import hooks - all logic is here now!
import { useMarketRequests } from "@/src/hooks/useMarketRequests";
import { useRequestForm } from "@/src/hooks/useRequestForm";
import { requestApi } from "@/src/services/api/requestApi";

export default function RequestsPage() {
  const { user } = useAuth();

  // ✅ All data fetching logic in hook
  const { requests, loading } = useMarketRequests();

  // ✅ All form logic in hook
  const {
    title,
    setTitle,
    budget,
    setBudget,
    description,
    setDescription,
    submitting,
    submitRequest,
  } = useRequestForm();

  // Local UI state
  const [isModalVisible, setModalVisible] = useState(false);

  /**
   * Handle menu action (delete)
   * SIMPLIFIED - just calls requestApi
   */
  const handleMenuAction = (item: MarketRequest) => {
    if (user?.id !== item.dealerId) return;

    Alert.alert("Manage Request", `Options for ${item.title}`, [
      {
        text: "Delete Request",
        style: "destructive",
        onPress: async () => {
          try {
            await requestApi.deleteRequest(item.id);
          } catch (e) {
            Alert.alert("Error", "Could not delete request.");
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  /**
   * Handle post request
   * SIMPLIFIED - just calls hook
   */
  const handlePostRequest = async () => {
    const success = await submitRequest();
    if (success) {
      setModalVisible(false);
    }
  };

  /**
   * Render request card
   */
  const renderItem = ({ item }: { item: MarketRequest }) => {
    const isOwner = user?.id === item.dealerId;
    const isFulfilled = item.status === "fulfilled";

    return (
      <View
        className={`bg-white rounded-2xl p-5 mb-4 border border-gray-100 shadow-sm relative overflow-hidden ${isFulfilled ? "opacity-60" : ""}`}
      >
        {/* Tag */}
        <View
          className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl z-10 ${isFulfilled ? "bg-green-100" : "bg-red-50"}`}
        >
          <Text
            className={`text-[10px] font-bold uppercase ${isFulfilled ? "text-green-700" : "text-red-500"}`}
          >
            {isFulfilled ? "Fulfilled" : "Wanted"}
          </Text>
        </View>

        {/* Header Row */}
        <View className="flex-row items-start mb-3 justify-between">
          <View className="flex-row items-start flex-1">
            <View className="w-12 h-12 bg-indigo-50 rounded-xl items-center justify-center mr-4">
              <Ionicons
                name={isFulfilled ? "checkmark-circle" : "search"}
                size={24}
                color={isFulfilled ? "green" : "#4F46E5"}
              />
            </View>

            <View className="flex-1 pr-8">
              <Text
                className={`text-lg font-bold leading-6 ${isFulfilled ? "line-through text-gray-400" : "text-gray-900"}`}
              >
                {item.title}
              </Text>
              <Text className="text-gray-500 text-xs">
                Posted by{" "}
                <Text className="font-semibold text-gray-700">
                  {isOwner ? "You" : item.dealerName}
                </Text>
              </Text>
            </View>
          </View>

          {isOwner && (
            <TouchableOpacity
              onPress={() => handleMenuAction(item)}
              className="p-2 -mt-2 -mr-2"
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Info */}
        <View className="flex-row justify-between items-center bg-gray-50 p-3 rounded-lg mb-3">
          <View>
            <Text className="text-gray-400 text-[10px] font-bold uppercase">
              Target Budget
            </Text>
            <Text className="text-gray-900 font-bold text-base">
              ₹ {item.budget}
            </Text>
          </View>
          <View className="w-[1px] h-8 bg-gray-200" />
          <View className="flex-1 pl-4">
            <Text className="text-gray-400 text-[10px] font-bold uppercase">
              Details
            </Text>
            <Text numberOfLines={1} className="text-gray-600 text-xs mt-0.5">
              {item.description || "Any condition accepted"}
            </Text>
          </View>
        </View>

        {/* Action Button */}
        {!isOwner && !isFulfilled && (
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "Connect",
                `Call ${item.dealerName} to fulfill this request.`
              )
            }
            className="w-full border border-indigo-600 py-3 rounded-xl flex-row justify-center items-center active:bg-indigo-50"
          >
            <Text className="text-indigo-600 font-bold text-sm mr-2">
              I Have This
            </Text>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color="#4F46E5"
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ========================================
  // UI ONLY FROM HERE - NO LOGIC!
  // ========================================

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View className="px-6 py-4 bg-white border-b border-gray-100 flex-row justify-between items-center">
        <View>
          <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider">
            Reverse Market
          </Text>
          <Text className="text-2xl font-black text-gray-900">
            Buying Requests
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="bg-black w-10 h-10 rounded-full items-center justify-center shadow-lg"
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4F46E5" />
        </View>
      ) : requests.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10 opacity-50">
          <Ionicons name="clipboard-outline" size={64} color="#9CA3AF" />
          <Text className="text-gray-500 font-medium mt-4 text-center">
            No active requests.
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-end bg-black/50"
        >
          <View className="bg-white rounded-t-3xl p-6 h-[70%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-gray-900">
                Make a Request
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="bg-gray-100 p-2 rounded-full"
              >
                <Ionicons name="close" size={20} color="black" />
              </TouchableOpacity>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-gray-700 font-bold mb-1 ml-1">
                  Looking For (Model)
                </Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Ex. iPhone 14 Plus 128GB"
                  className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-gray-900"
                />
              </View>

              <View>
                <Text className="text-gray-700 font-bold mb-1 ml-1">
                  Max Budget (₹)
                </Text>
                <TextInput
                  value={budget}
                  onChangeText={setBudget}
                  keyboardType="numeric"
                  placeholder="Ex. 45000"
                  className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-gray-900"
                />
              </View>

              <View>
                <Text className="text-gray-700 font-bold mb-1 ml-1">
                  Additional Notes
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  placeholder="Ex. Need Urgent. Only Black color."
                  textAlignVertical="top"
                  className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-gray-900 min-h-[100px]"
                />
              </View>

              <TouchableOpacity
                onPress={handlePostRequest}
                disabled={submitting}
                className="bg-indigo-600 w-full py-4 rounded-xl mt-4 items-center flex-row justify-center shadow-md"
              >
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text className="text-white font-bold text-lg mr-2">
                      Post Request
                    </Text>
                    <Ionicons name="paper-plane" size={20} color="white" />
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
