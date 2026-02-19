import { useAuth } from "@/src/context/AuthContext";
import type { Product } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
let ImageView: any = null;

if (Platform.OS !== "web") {
  ImageView = require("react-native-image-viewing").default;
}

// 📐 Card dimensions
export const CARD_HEIGHT = 164;
const IMAGE_WIDTH = 144;

interface SearchProductCardProps {
  item: Product;
}

export const SearchProductCard: React.FC<SearchProductCardProps> = ({
  item,
}) => {
  const router = useRouter();
  const { user } = useAuth();

  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  // 🖼️ Safe Image Array
  const images =
    item.images && item.images.length > 0 ? item.images : [item.image || ""];
  const viewerImages = images.map((uri) => ({ uri }));

  // 🔗 WhatsApp Action
  const openWhatsApp = () => {
    const phoneNumber = item.dealerPhone;
    if (!phoneNumber) {
      alert("Dealer number not available.");
      return;
    }
    const message = `Hi, I'm interested in: ${item.name} - ₹${item.price}`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}&phone=${phoneNumber}`;
    Linking.openURL(url).catch(() => alert("Could not open WhatsApp"));
  };

  // 🔗 Profile Action
  const goToProfile = () => {
    const uid = item.userId || item.dealerId || (item as any).owner_id;
    if (!uid) return;

    const currentUserId = user?.id || (user as any)?.uid;

    if (uid === currentUserId) {
      router.push("/(dealer)/profile" as any);
    } else {
      router.push(`/(dealer)/profile/${uid}` as any);
    }
  };

  // ⋮ Menu actions
  const menuActions = [
    {
      label: "WhatsApp",
      icon: "logo-whatsapp" as const,
      color: "#25D366",
      onPress: openWhatsApp,
    },
    {
      label: "View Profile",
      icon: "person-circle-outline" as const,
      color: "#4F46E5",
      onPress: goToProfile,
    },
    {
      label: "Share",
      icon: "share-social-outline" as const,
      color: "#F59E0B",
      onPress: () => {
        Share.share({
          message: `Check out ${item.name} for ₹${Number(item.price).toLocaleString()} on Mobile Marketplace!`,
        });
      },
    },
  ];

  // 👤 Dealer Data
  const dealerName = item.dealerName || "Dealer";
  const dealerAvatar =
    item.dealerAvatar ||
    item.dealerPhoto ||
    `https://ui-avatars.com/api/?name=${dealerName}&background=random&color=fff&background=000`;

  return (
    <View
      style={{ width: SCREEN_WIDTH, paddingHorizontal: 14, marginBottom: 14 }}
    >
      {/* 📦 CARD CONTAINER */}
      <View
        style={{
          height: CARD_HEIGHT,
          flexDirection: "row",
          backgroundColor: "white",
          borderRadius: 20,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        {/* 👈 LEFT: IMAGE AREA */}
        <View
          style={{
            width: IMAGE_WIDTH,
            height: "100%",
            backgroundColor: "#F0F0F0",
            position: "relative",
          }}
        >
          <FlashList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_: string, i: number) => `img-${item.id}-${i}`}
            renderItem={({ item: imgUri }: { item: string }) => (
              <Pressable onPress={() => setIsViewerVisible(true)}>
                {imgUri ? (
                  <Image
                    source={{ uri: imgUri }}
                    style={{ width: IMAGE_WIDTH, height: CARD_HEIGHT }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: IMAGE_WIDTH,
                      height: CARD_HEIGHT,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#E5E7EB",
                    }}
                  >
                    <Ionicons name="image" size={32} color="#D1D5DB" />
                  </View>
                )}
              </Pressable>
            )}
            onMomentumScrollEnd={(e: any) => {
              const index = Math.round(
                e.nativeEvent.contentOffset.x / IMAGE_WIDTH
              );
              setActiveIndex(index);
            }}
          />

          {/* Image count badge */}
          {images.length > 1 && (
            <View
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                backgroundColor: "rgba(0,0,0,0.55)",
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: 10,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons name="images-outline" size={10} color="white" />
              <Text
                style={{
                  color: "white",
                  fontSize: 10,
                  fontWeight: "700",
                  marginLeft: 3,
                }}
              >
                {images.length}
              </Text>
            </View>
          )}

          {/* Gradient overlay at bottom of image */}
          <LinearGradient
            pointerEvents="none"
            colors={["transparent", "rgba(0,0,0,0.3)"]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 40,
            }}
          />

          {/* Dots */}
          {images.length > 1 && (
            <View
              style={{
                position: "absolute",
                bottom: 8,
                width: "100%",
                flexDirection: "row",
                justifyContent: "center",
                gap: 4,
              }}
            >
              {images.map((_: string, i: number) => (
                <View
                  key={i}
                  style={{
                    width: i === activeIndex ? 14 : 5,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor:
                      i === activeIndex
                        ? "white"
                        : "rgba(255,255,255,0.45)",
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {/* 👉 RIGHT: DETAILS AREA */}
        <View style={{ flex: 1, padding: 14, justifyContent: "space-between" }}>
          {/* Top Section */}
          <View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <Text
                numberOfLines={2}
                style={{
                  color: "#111827",
                  fontWeight: "800",
                  fontSize: 14,
                  lineHeight: 19,
                  flex: 1,
                  letterSpacing: -0.2,
                }}
              >
                {item.name}
              </Text>

              {/* 3-Dots Menu */}
              <TouchableOpacity
                onPress={() => setMenuOpen(true)}
                style={{ padding: 4, marginRight: -6, marginTop: -4 }}
              >
                <Ionicons name="ellipsis-vertical" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Price */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 6,
              }}
            >
              <Text
                style={{
                  color: "#059669",
                  fontWeight: "900",
                  fontSize: 17,
                  letterSpacing: -0.4,
                }}
              >
                ₹{Number(item.price).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Middle: Dealer Row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 4,
            }}
          >
            <Image
              source={{ uri: dealerAvatar }}
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            />
            <Text
              numberOfLines={1}
              style={{
                fontSize: 11,
                color: "#6B7280",
                marginLeft: 6,
                fontWeight: "500",
                flex: 1,
              }}
            >
              {dealerName}
            </Text>
            {item.city && (
              <>
                <View
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: 1.5,
                    backgroundColor: "#D1D5DB",
                    marginHorizontal: 5,
                  }}
                />
                <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "500" }}>
                  {item.city}
                </Text>
              </>
            )}
          </View>

          {/* Bottom Action Row */}
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginTop: "auto",
              paddingTop: 10,
            }}
          >
            {/* Primary: Chat */}
            <TouchableOpacity
              onPress={openWhatsApp}
              activeOpacity={0.85}
              style={{
                flex: 1,
                backgroundColor: "#111827",
                height: 38,
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#111827",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Ionicons name="chatbubble-ellipses" size={16} color="white" />
              <Text
                style={{
                  color: "white",
                  fontWeight: "700",
                  fontSize: 13,
                  marginLeft: 6,
                  letterSpacing: 0.3,
                }}
              >
                Chat
              </Text>
            </TouchableOpacity>

            {/* Secondary: Profile */}
            <TouchableOpacity
              onPress={goToProfile}
              activeOpacity={0.8}
              style={{
                width: 38,
                height: 38,
                backgroundColor: "#F3F4F6",
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="person-outline" size={18} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 🖼️ Full Screen Viewer */}
      {ImageView && (
        <ImageView
          images={viewerImages}
          imageIndex={activeIndex}
          visible={isViewerVisible}
          onRequestClose={() => setIsViewerVisible(false)}
        />
      )}

      {/* ⋮ Custom Dropdown Menu */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          onPress={() => setMenuOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 40,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              backgroundColor: "white",
              borderRadius: 20,
              paddingVertical: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 24,
              elevation: 10,
            }}
          >
            {/* Menu Header */}
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 12,
                paddingBottom: 14,
                borderBottomWidth: 1,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontWeight: "800",
                  fontSize: 15,
                  color: "#111827",
                  letterSpacing: -0.3,
                }}
              >
                {item.name}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#059669",
                  fontWeight: "700",
                  marginTop: 2,
                }}
              >
                ₹{Number(item.price).toLocaleString()}
              </Text>
            </View>

            {/* Menu Items */}
            {menuActions.map((action, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.7}
                onPress={() => {
                  setMenuOpen(false);
                  setTimeout(() => action.onPress(), 200);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: action.color + "15",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={action.icon}
                    size={20}
                    color={action.color}
                  />
                </View>
                <Text
                  style={{
                    marginLeft: 14,
                    fontSize: 15,
                    fontWeight: "600",
                    color: "#1F2937",
                  }}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Cancel */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setMenuOpen(false)}
              style={{
                marginTop: 4,
                marginHorizontal: 16,
                marginBottom: 10,
                paddingVertical: 12,
                borderRadius: 14,
                backgroundColor: "#F3F4F6",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 14,
                  color: "#6B7280",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export const CARD_WIDTH = SCREEN_WIDTH;
