import { FeedProductCard } from "@/src/components/FeedProductCard";
import { useAuth } from "@/src/context/AuthContext";
import { useProfileData } from "@/src/hooks/useProfileData";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SW, height: SH } = Dimensions.get("window");

const SIDE_PAD = 16;
const CARD_W = SW - SIDE_PAD * 2;
const CARD_H = SH * 0.75;

export default function ProductFeed() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { productId, from, userId: paramUserId, t, initialIndex } = useLocalSearchParams();

  const paramUserIdStr = typeof paramUserId === "string" ? paramUserId : paramUserId?.[0];
  const targetUserId = paramUserIdStr || user?.id;
  const { listings, profileData, loading } = useProfileData(targetUserId);

  const [displayListings, setDisplayListings] = useState<any[]>([]);
  const flatListRef = useRef<FlatList<any>>(null);

  // --- DERIVED STATE & CACHE BUSTING ---
  const currentT = typeof t === "string" ? t : t?.[0] ?? "";
  const pid = typeof productId === "string" ? productId : productId?.[0] ?? "";
  const initIdxStr = typeof initialIndex === "string" ? initialIndex : initialIndex?.[0] ?? "";

  // Compute our target starting index
  let defaultIdx = 0;
  if (initIdxStr && !isNaN(parseInt(initIdxStr, 10))) {
    defaultIdx = parseInt(initIdxStr, 10);
  } else if (pid && listings.length > 0) {
    const found = listings.findIndex((l) => l.id === pid);
    if (found >= 0) defaultIdx = found;
  }

  const [currentIndex, setCurrentIndex] = useState(defaultIdx);

  // Synchronously reset `currentIndex` when moving to a new click event (t changes)
  const lastT = useRef<string>(currentT);
  if (currentT !== lastT.current) {
    lastT.current = currentT;
    setCurrentIndex(defaultIdx);
  }

  // --- LISTINGS FETCH EFFECT ---
  const lastTargetUserId = useRef<string | null | undefined>(null);

  useEffect(() => {
    // Force a fresh loading screen if swapping entire dealer profiles
    if (targetUserId !== lastTargetUserId.current) {
      lastTargetUserId.current = targetUserId;
      setDisplayListings([]);
    }

    if (loading || listings.length === 0) return;

    // Apply the active listings array once loaded
    setDisplayListings(listings);
  }, [listings, loading, targetUserId]);

  const handleDeleted = useCallback((deletedId: string) => {
    setDisplayListings((prev) => prev.filter((l) => l.id !== deletedId));
  }, []);

  const handleUpdated = useCallback((updatedId: string, updates: any) => {
    setDisplayListings((prev) =>
      prev.map((l) =>
        l.id === updatedId
          ? { ...l, ...updates, price: Number(updates.price) || l.price }
          : l
      )
    );
  }, []);

  const handleClose = useCallback(() => {
    if (from === "profile") {
      if (paramUserIdStr && paramUserIdStr !== user?.id) {
        router.navigate(`/(dealer)/profile/${paramUserIdStr}` as any);
      } else {
        router.navigate("/(dealer)/profile" as any);
      }
    } else {
      router.navigate("/(dealer)/home" as any);
    }
  }, [from, paramUserIdStr, user?.id, router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, [handleClose]);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: CARD_H,
      offset: CARD_H * index,
      index,
    }),
    []
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]?.index != null) setCurrentIndex(viewableItems[0].index);
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <View style={styles.cardSlot}>
        <FeedProductCard
          item={item}
          height={CARD_H}
          width={CARD_W}
          dealerPhone={profileData?.phone}
          onClose={handleClose}
          onDeleted={handleDeleted}
          onUpdated={handleUpdated}
        />
      </View>
    ),
    [handleClose, handleDeleted, handleUpdated, profileData?.phone]
  );

  if (loading || displayListings.length === 0) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const total = displayListings.length;
  const isOwner = targetUserId === user?.id;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#111" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{isOwner ? "My Listings" : "Listings"}</Text>
          <Text style={styles.headerSub}>{currentIndex + 1} of {total}</Text>
        </View>

        {/* Scroll-to-top — only appears when not on first card */}
        {currentIndex > 0 ? (
          <TouchableOpacity
            style={styles.topBtn}
            onPress={() => {
              flatListRef.current?.scrollToIndex({ index: 0, animated: true });
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="arrow-up" size={15} color="#4F46E5" />
          </TouchableOpacity>
        ) : (
          <View style={styles.topBtn} pointerEvents="none" />
        )}
      </View>

      {/* ── CARD SWIPER ── */}
      <View style={styles.cardBox}>
        <FlatList
          key={currentT || "feed"}
          ref={flatListRef}
          data={displayListings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={CARD_H}
          snapToAlignment="start"
          getItemLayout={getItemLayout}
          // initialScrollIndex bounded synchronously against displayListings.
          // The key=currentT forcefully unmounts FlatList for every unique tab open.
          initialScrollIndex={displayListings.length > 0 ? Math.min(defaultIdx, displayListings.length - 1) : 0}
          windowSize={3}
          maxToRenderPerBatch={2}
          initialNumToRender={2}
          removeClippedSubviews
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onScrollToIndexFailed={(info) => {
            const wait = new Promise((r) => setTimeout(r, 100));
            wait.then(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
            });
          }}
        />
      </View>

      {/* ── SWIPE HINT — only on first card ── */}
      {total > 1 && currentIndex === 0 && (
        <View style={[styles.hint, { paddingBottom: insets.bottom + 8 }]}>
          <Ionicons name="swap-vertical-outline" size={13} color="#9CA3AF" />
          <Text style={styles.hintText}>Swipe up to browse</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F7F7FB",
    alignItems: "center",
  },
  loading: {
    flex: 1,
    backgroundColor: "#F7F7FB",
    alignItems: "center",
    justifyContent: "center",
  },

  // Header
  header: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  topBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  headerCenter: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  headerSub: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
    marginTop: 1,
  },

  // Card
  cardBox: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 22,
    overflow: "hidden",
    marginTop: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
    backgroundColor: "#000",
  },
  cardSlot: {
    width: CARD_W,
    height: CARD_H,
  },

  // Swipe hint
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 12,
  },
  hintText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});
