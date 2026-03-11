import { supabase } from "@/src/supabaseConfig";
import type { Product } from "@/src/types";
import { communications } from "@/src/utils/communications";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
  ViewToken
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const FONTS = {
  title: Platform.OS === "ios" ? "AvenirNext-Heavy" : "sans-serif-black",
  price: Platform.OS === "ios" ? "AvenirNext-Bold" : "sans-serif-condensed",
  dealer: Platform.OS === "ios" ? "AvenirNext-DemiBold" : "sans-serif-medium",
  desc: Platform.OS === "ios" ? "Avenir-Medium" : "sans-serif-medium",
};

// ── Module-level profile cache ─────────────────────────────────────────────
// Keyed by user-id. Serves cached data instantly on component recycling so
// the user never sees a wrong dealer name/photo between scroll position changes.
type CachedProfile = { name: string; photo: string | null; city: string };
const profileCache = new Map<string, CachedProfile>();

// ── Helper to reliably get the creator user ID ─────────────────────────────
const getCreatorId = (item: any): string | null =>
  item?.userId || item?.owner_id || item?.dealerId || item?.createdBy || null;

interface ProductCardProps {
  item: Product;
  height: number;
  onPressProfile: (uid: string) => void;
  onPressImage: (images: string[], index: number) => void;
}

export const ProductCard = React.memo(
  ({ item, height, onPressProfile, onPressImage }: ProductCardProps) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [expanded, setExpanded] = useState(false);

    const uid = getCreatorId(item);

    // Initialise from cache immediately — no flicker even on recycled cells
    const [dealerProfile, setDealerProfile] = useState<CachedProfile>(() => {
      if (uid && profileCache.has(uid)) return profileCache.get(uid)!;
      return {
        name: (item as any).dealerName || "Dealer",
        photo: (item as any).dealerPhoto || null,
        city: item.city || "India",
      };
    });

    const onViewableItemsChanged = useRef(
      ({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems[0]?.index != null) {
          setActiveIndex(viewableItems[0].index);
        }
      }
    ).current;

    const viewabilityConfig = useRef({
      viewAreaCoveragePercentThreshold: 60,
    }).current;

    const images =
      item.images?.length > 0 ? item.images : item.image ? [item.image] : [];

    // ── Profile fetch with cache + cancel-on-unmount ───────────────────────
    // When FlashList recycles this cell for a new item (uid changes):
    //   1. If cache hit → update state instantly, no network call.
    //   2. Otherwise → reset to item-embedded data first (clears stale name),
    //      then fire a fetch. If the component is recycled again before it
    //      completes, set `cancelled = true` so the stale result is dropped.
    useEffect(() => {
      if (!uid) return;

      if (profileCache.has(uid)) {
        setDealerProfile(profileCache.get(uid)!);
        return;
      }

      // Reset immediately so no stale dealer info lingers
      setDealerProfile({
        name: (item as any).dealerName || "Dealer",
        photo: (item as any).dealerPhoto || null,
        city: item.city || "India",
      });

      let cancelled = false;

      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("display_name, shop_name, photo_url, city")
            .eq("id", uid)
            .single();

          if (cancelled || error || !data) return;

          const profile: CachedProfile = {
            name: data.shop_name || data.display_name || "Dealer",
            photo: data.photo_url || null,
            city: data.city || "India",
          };
          profileCache.set(uid, profile);
          setDealerProfile(profile);
        } catch {
          // Fail silently — fallback data already shown
        }
      };

      fetchProfile();
      // Cancel in-flight fetch if the cell is recycled before it resolves
      return () => { cancelled = true; };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uid]);

    const handleWhatsAppPress = async () => {
      const phone = (item as any).dealerPhone || (item as any).phone;
      communications.askDealerForProduct(phone, item.name, item.description || "", `₹${Number(item.price).toLocaleString("en-IN")}`, item.id);
    };

    const handleSharePress = () => {
      communications.shareProduct(item.name, item.description || "", `₹${Number(item.price).toLocaleString("en-IN")}`, item.id);
    };

    const handleProfileClick = () => {
      const id = getCreatorId(item);
      if (id) onPressProfile(id);
    };

    return (
      <View style={{ height, width: SCREEN_WIDTH, backgroundColor: "white" }}>
        {/* Card container */}
        <View
          style={{
            flex: 1,
            marginHorizontal: 8,
            marginVertical: 4,
            borderRadius: 28,
            overflow: "hidden",
            backgroundColor: "black",
          }}
        >
          {/* IMAGE SLIDER */}
          <FlashList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            keyExtractor={(_, index) => `${item.id}-${index}`}
            renderItem={({ item: imgUri, index }) => (
              <Pressable
                onPress={() => onPressImage(images, index)}
                style={{ width: SCREEN_WIDTH - 16 }}
              >
                <Image
                  source={{ uri: imgUri }}
                  style={{ width: "100%", height: height - 8 }}
                  resizeMode="cover"
                />
              </Pressable>
            )}
          />

          {/* GRADIENT OVERLAY */}
          <LinearGradient
            pointerEvents="none"
            colors={["transparent", "rgba(0,0,0,0.5)", "rgba(10,10,10,1)"]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: height * 0.55,
            }}
          />

          {/* DEALER BADGE */}
          <TouchableOpacity
            onPress={handleProfileClick}
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.4)",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
            }}
          >
            <Image
              source={{
                uri:
                  dealerProfile.photo ||
                  `https://ui-avatars.com/api/?name=${dealerProfile.name}&background=random`,
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.4)",
              }}
            />
            <View style={{ marginLeft: 8 }}>
              <Text style={{ color: "#E0E7FF", fontSize: 13, fontWeight: "700", letterSpacing: 0.2, fontFamily: FONTS.dealer }}>
                {dealerProfile.name}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                <Ionicons name="location-sharp" size={10} color="#9CA3AF" />
                <Text style={{ color: "#D1D5DB", fontSize: 10, marginLeft: 3, fontWeight: "500" }}>
                  {dealerProfile.city}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* BOTTOM CONTENT */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 20,
              paddingBottom: 24,
            }}
          >
            {/* IMAGE DOTS */}
            {images.length > 1 && (
              <View
                style={{
                  alignSelf: "center",
                  flexDirection: "row",
                  gap: 6,
                  marginBottom: 12,
                  backgroundColor: "rgba(0,0,0,0.2)",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}
              >
                {images.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      borderRadius: 999,
                      backgroundColor:
                        i === activeIndex ? "white" : "rgba(255,255,255,0.5)",
                      width: i === activeIndex ? 8 : 6,
                      height: i === activeIndex ? 8 : 6,
                    }}
                  />
                ))}
              </View>
            )}

            {/* TITLE + PRICE + CHAT */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginBottom: 12,
              }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text
                  style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 26, lineHeight: 32, letterSpacing: -0.5, fontFamily: FONTS.title }}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                <Text style={{ color: "#34D399", fontWeight: "800", fontSize: 24, marginTop: 4, letterSpacing: -0.5, fontFamily: FONTS.price }}>
                  ₹{Number(item.price).toLocaleString()}
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={handleSharePress}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.2)",
                    height: 48,
                    width: 48,
                    borderRadius: 24,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="share-social" size={20} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleWhatsAppPress}
                  style={{
                    backgroundColor: "#25D366",
                    height: 48,
                    width: 48,
                    borderRadius: 24,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="chatbubble" size={20} color="#064E3B" />
                </TouchableOpacity>
              </View>
            </View>

            {/* DESCRIPTION */}
            <Pressable onPress={() => setExpanded(!expanded)}>
              <Text
                numberOfLines={expanded ? 4 : 2}
                style={{ color: "#D1D5DB", fontSize: 14, lineHeight: 20, fontWeight: "400", fontFamily: FONTS.desc }}
              >
                {item.description || "No description provided."}
              </Text>
              {(item.description?.length || 0) > 60 && (
                <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 6, fontWeight: "600", letterSpacing: 0.5 }}>
                  {expanded ? "Show less" : "...more"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    );
  }
);