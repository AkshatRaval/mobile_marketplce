// src/components/PublicProfileHeader.tsx

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ✅ 1. Defined the type here to prevent errors
export type ConnectionStatus = "none" | "pending" | "connected" | "received";

interface PublicProfileHeaderProps {
  dealerData: any;
  connections: any[];
  inventoryCount: number;
  requestStatus: ConnectionStatus; // <--- Updated Type
  processing: boolean;
  onWhatsAppPress: () => void;
  onConnectPress: () => void;
  onConnectionPress: (id: string) => void;
}

export function PublicProfileHeader({
  dealerData,
  connections,
  inventoryCount,
  requestStatus,
  processing,
  onWhatsAppPress,
  onConnectPress,
  onConnectionPress,
}: PublicProfileHeaderProps) {
  
  // ✅ 2. Button Logic (Handles all 4 states)
  const getButtonConfig = () => {
    switch (requestStatus) {
      case "connected":
        return {
          text: "Connected",
          bg: "bg-green-100",
          textColor: "text-green-700",
          icon: "checkmark-circle" as const,
        };
      case "pending":
        return {
          text: "Requested",
          bg: "bg-gray-100",
          textColor: "text-gray-500",
          icon: "time-outline" as const,
        };
      case "received": // <--- New "Accept" State
        return {
          text: "Accept Request",
          bg: "bg-blue-600",
          textColor: "text-white",
          icon: "person-add-outline" as const,
        };
      default: // 'none'
        return {
          text: "Connect",
          bg: "bg-black",
          textColor: "text-white",
          icon: "add-circle-outline" as const,
        };
    }
  };

  const btn = getButtonConfig();

  return (
    <View className="bg-white p-6 pb-4 rounded-b-3xl shadow-sm mb-4">
      {/* Profile Info */}
      <View className="flex-row items-center">
        <Image
          source={{
            uri:
              dealerData.photoURL ||
              `https://ui-avatars.com/api/?name=${dealerData.displayName}`,
          }}
          className="w-20 h-20 rounded-full bg-gray-200"
        />
        <View className="ml-4 flex-1">
          <Text className="text-xl font-bold text-gray-900">
            {dealerData.displayName}
          </Text>
          <Text className="text-gray-500 text-sm">
            {dealerData.location || "Location not available"}
          </Text>
          <View className="flex-row mt-2 gap-4">
            <View>
              <Text className="font-bold text-gray-900">{inventoryCount}</Text>
              <Text className="text-xs text-gray-500">Items</Text>
            </View>
            <View>
              <Text className="font-bold text-gray-900">
                {connections?.length || 0}
              </Text>
              <Text className="text-xs text-gray-500">Connections</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row gap-3 mt-6">
        <TouchableOpacity
          onPress={onConnectPress}
          disabled={processing || requestStatus === "pending"}
          className={`flex-1 ${btn.bg} py-3 rounded-xl flex-row justify-center items-center`}
        >
          {processing ? (
            <ActivityIndicator
              color={btn.textColor.includes("white") ? "white" : "black"}
            />
          ) : (
            <>
              <Ionicons
                name={btn.icon}
                size={20}
                color={btn.textColor.includes("white") ? "white" : "black"}
              />
              <Text className={`font-bold ml-2 ${btn.textColor}`}>
                {btn.text}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onWhatsAppPress}
          className="bg-green-500 w-12 h-12 rounded-xl justify-center items-center"
        >
          <Ionicons name="logo-whatsapp" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Connections Preview */}
      {connections && connections.length > 0 && (
        <View className="mt-6 pt-6 border-t border-gray-100">
          <Text className="font-bold text-gray-900 mb-3">Connections</Text>
          <View className="flex-row pl-2">
            {connections.slice(0, 5).map((friend, index) => (
              <TouchableOpacity
                key={friend.uid || index}
                onPress={() => onConnectionPress(friend.uid)}
                className="-ml-3 first:ml-0 border-2 border-white rounded-full"
              >
                <Image
                  source={{
                    uri:
                      friend.photoURL ||
                      `https://ui-avatars.com/api/?name=${friend.displayName}`,
                  }}
                  className="w-10 h-10 rounded-full bg-gray-200"
                />
              </TouchableOpacity>
            ))}
            {connections.length > 5 && (
              <View className="-ml-3 w-10 h-10 rounded-full bg-gray-100 border-2 border-white justify-center items-center">
                <Text className="text-xs font-bold text-gray-500">
                  +{connections.length - 5}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}