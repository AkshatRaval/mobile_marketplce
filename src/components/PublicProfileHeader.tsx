// src/components/PublicProfileHeader.tsx
// UPDATED - Now shows connections

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface PublicProfileHeaderProps {
  dealerData: any;
  connections: any[];
  inventoryCount: number;
  requestStatus: "none" | "pending" | "connected";
  processing: boolean;
  onWhatsAppPress: () => void;
  onConnectPress: () => void;
  onConnectionPress: (userId: string) => void;
}

export const PublicProfileHeader: React.FC<PublicProfileHeaderProps> = ({
  dealerData,
  connections,
  inventoryCount,
  requestStatus,
  processing,
  onWhatsAppPress,
  onConnectPress,
  onConnectionPress,
}) => {
  if (!dealerData) return null;

  const displayName = dealerData.displayName || "Dealer";
  const shopName = dealerData.shopName || displayName;
  const city = dealerData.city || "Global";
  const photoURL = dealerData.photoURL || `https://ui-avatars.com/api/?name=${displayName}`;
  const connectionsCount = dealerData.connections?.length || 0;

  return (
    <View>
      {/* Gradient Banner */}
      <View style={{ height: 140, width: '100%', overflow: 'hidden' }}>
        <LinearGradient
          colors={["#4F46E5", "#818CF8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: '100%', height: '100%' }}
        />
      </View>

      {/* Profile Card */}
      <View style={{ marginHorizontal: 20, marginTop: -64, backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 }}>
        
        {/* Profile Photo */}
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Image
            source={{ uri: photoURL }}
            style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: 'white', marginTop: -64, backgroundColor: '#E5E7EB' }}
          />
        </View>

        {/* Name and Verification */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#111827', textAlign: 'center' }}>
            {shopName}
          </Text>
          <Ionicons name="checkmark-circle" size={20} color="#4F46E5" style={{ marginLeft: 6 }} />
        </View>

        {/* Username and Location */}
        <Text style={{ fontSize: 14, color: '#6B7280', fontWeight: '500', textAlign: 'center', marginBottom: 16 }}>
          @{displayName.replace(/\s/g, "").toLowerCase()} • {city}
        </Text>

        {/* Stats */}
        <View style={{ flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 24, marginBottom: 20 }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#111827' }}>
              {inventoryCount}
            </Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginTop: 4 }}>
              Items
            </Text>
          </View>
          <View style={{ width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 8 }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#4F46E5' }}>
              {connectionsCount}
            </Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginTop: 4 }}>
              Circle
            </Text>
          </View>
          <View style={{ width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 8 }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#10B981' }}>
              Open
            </Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginTop: 4 }}>
              Status
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {/* WhatsApp Button */}
          <TouchableOpacity
            onPress={onWhatsAppPress}
            style={{ flex: 1, backgroundColor: '#22C55E', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={18} color="white" style={{ marginRight: 6 }} />
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>WhatsApp</Text>
          </TouchableOpacity>

          {/* Connect Button */}
          <TouchableOpacity
            onPress={onConnectPress}
            disabled={processing || requestStatus === "connected"}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              backgroundColor:
                requestStatus === "connected"
                  ? "#DCFCE7"
                  : requestStatus === "pending"
                  ? "#FEF3C7"
                  : "#111827",
              borderColor:
                requestStatus === "connected"
                  ? "#BBF7D0"
                  : requestStatus === "pending"
                  ? "#FDE68A"
                  : "#111827",
            }}
            activeOpacity={0.8}
          >
            {processing ? (
              <ActivityIndicator color={requestStatus === "none" ? "white" : "gray"} size="small" />
            ) : (
              <>
                <Ionicons
                  name={
                    requestStatus === "connected"
                      ? "checkmark"
                      : requestStatus === "pending"
                      ? "time"
                      : "person-add"
                  }
                  size={18}
                  color={
                    requestStatus === "none"
                      ? "white"
                      : requestStatus === "connected"
                      ? "#16A34A"
                      : "#CA8A04"
                  }
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    fontWeight: '700',
                    fontSize: 14,
                    color:
                      requestStatus === "connected"
                        ? "#15803D"
                        : requestStatus === "pending"
                        ? "#A16207"
                        : "white",
                  }}
                >
                  {requestStatus === "connected"
                    ? "Connected"
                    : requestStatus === "pending"
                    ? "Pending"
                    : "Connect"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Connections Section */}
      {connections.length > 0 && (
        <View style={{ marginTop: 20, paddingLeft: 24 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 }}>
            Their Connections
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 24 }}
          >
            {connections.map((connection) => (
              <TouchableOpacity
                key={connection.uid}
                onPress={() => onConnectionPress(connection.uid)}
                style={{ marginRight: 16, alignItems: 'center' }}
              >
                <Image
                  source={{
                    uri: connection.photoURL || `https://ui-avatars.com/api/?name=${connection.displayName}`,
                  }}
                  style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F3F4F6' }}
                />
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 10, color: '#6B7280', marginTop: 4, width: 56, textAlign: 'center' }}
                >
                  {connection.displayName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Section Title */}
      <Text style={{ fontSize: 18, fontWeight: '900', color: '#111827', marginHorizontal: 24, marginTop: 24, marginBottom: 16 }}>
        Inventory ({inventoryCount})
      </Text>
    </View>
  );
};