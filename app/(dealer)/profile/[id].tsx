// app/profile/[id].tsx
// UPDATED - Now shows and navigates to connections

import { ProductGridItem } from "@/src/components/ProductGridItem";
import { PublicProfileHeader } from "@/src/components/PublicProfileHeader";
import { useAuth } from "@/src/context/AuthContext";
import { useConnectionActions } from "@/src/hooks/useConnectionActions";
import { useConnectionStatus } from "@/src/hooks/useConnectionStatus";
import { usePublicProfile } from "@/src/hooks/usePublicProfile";
import { communications } from "@/src/utils/communications";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ImageView from "react-native-image-viewing";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - 48) / 2;

export default function PublicDealerProfile() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();

  const { dealerData, inventory, connections, loading } = usePublicProfile(id);
  const { status: requestStatus } = useConnectionStatus(user?.uid, id);
  const { processing, handleConnect } = useConnectionActions(user?.uid, id);

  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [activeProduct, setActiveProduct] = useState<any>(null);

  useEffect(() => {
    if (user && id === user.uid) {
      router.replace("/profile");
    }
  }, [id, user]);

  const handleWhatsAppPress = () => {
    communications.openWhatsApp(dealerData?.phoneNumber);
  };

  const handleProductPress = (item: any) => {
    setActiveProduct(item);
    setIsViewerVisible(true);
  };

  const handleProductWhatsApp = () => {
    if (activeProduct && dealerData) {
      communications.openWhatsAppForProduct(
        dealerData.phoneNumber,
        activeProduct.name,
        activeProduct.price
      );
      setIsViewerVisible(false);
    }
  };

  const handleConnectionPress = (userId: string) => {
    console.log("Connection pressed:", userId);
    if (userId === user?.uid) {
      router.push("/profile");
    } else {
      router.push(`/profile/${userId}`);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ marginTop: 16, color: '#6B7280' }}>Loading profile...</Text>
      </View>
    );
  }

  if (!dealerData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB', paddingHorizontal: 24 }}>
        <Ionicons name="person-outline" size={64} color="#9CA3AF" />
        <Text style={{ marginTop: 16, color: '#6B7280', fontWeight: '700', fontSize: 18 }}>
          Profile Not Found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 24, backgroundColor: '#4F46E5', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
        >
          <Text style={{ color: 'white', fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ViewerFooter = () => {
    if (!activeProduct) return null;

    return (
      <View style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.8)', padding: 24, alignItems: 'center', paddingBottom: 40 }}>
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 18, marginBottom: 4 }}>
          {activeProduct.name}
        </Text>
        <Text style={{ color: '#D1D5DB', marginBottom: 16 }}>
          ₹{activeProduct.price}
        </Text>
        <TouchableOpacity
          onPress={handleProductWhatsApp}
          style={{ backgroundColor: '#22C55E', width: '100%', paddingVertical: 12, borderRadius: 999, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
        >
          <Ionicons name="logo-whatsapp" size={20} color="white" style={{ marginRight: 8 }} />
          <Text style={{ color: 'white', fontWeight: '700' }}>Chat about this phone</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Back Button */}
      <View style={{ position: 'absolute', top: 48, left: 20, zIndex: 20 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)',
          }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Connections */}
        <PublicProfileHeader
          dealerData={dealerData}
          connections={connections}
          inventoryCount={inventory.length}
          requestStatus={requestStatus}
          processing={processing}
          onWhatsAppPress={handleWhatsAppPress}
          onConnectPress={() => handleConnect(requestStatus)}
          onConnectionPress={handleConnectionPress}
        />

        {/* Product Grid */}
        {inventory.length === 0 ? (
          <View style={{ paddingVertical: 80, alignItems: 'center' }}>
            <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
            <Text style={{ color: '#9CA3AF', marginTop: 8, fontWeight: '500' }}>
              No items in stock
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 24, paddingBottom: 50 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {inventory.map((item) => (
                <ProductGridItem
                  key={item.id}
                  item={item}
                  width={COLUMN_WIDTH}
                  onPress={() => handleProductPress(item)}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Image Viewer */}
      {activeProduct && activeProduct.images && activeProduct.images.length > 0 && (
        <ImageView
          images={activeProduct.images.map((uri: string) => ({ uri }))}
          imageIndex={0}
          visible={isViewerVisible}
          onRequestClose={() => setIsViewerVisible(false)}
          FooterComponent={ViewerFooter}
        />
      )}
    </SafeAreaView>
  );
}