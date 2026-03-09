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
  const { productId, from } = useLocalSearchParams();

  const { listings } = useProfileData(user?.id);
  const [displayListings, setDisplayListings] = useState<any[]>([]);
  const flatListRef = useRef<FlatList<any>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Track which productId we last scrolled to — so we re-scroll whenever it changes
  const lastProductId = useRef<string | null>(null);
  const startIndexRef = useRef(0);

  useEffect(() => {
    if (listings.length === 0) return;

    // Always update the listings data
    setDisplayListings(listings);

    // Only re-scroll if productId has changed (new product tapped from grid)
    const pid = typeof productId === "string" ? productId : productId?.[0] ?? null;
    if (pid === lastProductId.current) return;
    lastProductId.current = pid;

    // Find the correct index in the FULL listings array using productId
    let idx = 0;
    if (pid) {
      const found = listings.findIndex((l) => l.id === pid);
      if (found >= 0) idx = found;
    }

    startIndexRef.current = idx;
    setCurrentIndex(idx);

    // Scroll imperatively — works whether FlatList is freshly mounted or already visible
    if (idx === 0) return;
    const doScroll = () => {
      flatListRef.current?.scrollToIndex({ index: idx, animated: false });
    };
    // Try immediately, then retry after layout if FlatList wasn't ready
    setTimeout(doScroll, 0);
  }, [listings, productId]);

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
      router.navigate("/(dealer)/profile" as any);
    } else {
      router.navigate("/(dealer)/home" as any);
    }
  }, [from, router]);

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
          onClose={handleClose}
          onDeleted={handleDeleted}
          onUpdated={handleUpdated}
        />
      </View>
    ),
    [handleClose, handleDeleted, handleUpdated]
  );

  if (displayListings.length === 0) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const total = displayListings.length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#111" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Listings</Text>
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
          // initialScrollIndex works reliably here because startIndexRef.current
          // is set synchronously before displayListings state update triggers this render.
          initialScrollIndex={startIndexRef.current || undefined}
          windowSize={3}
          maxToRenderPerBatch={2}
          initialNumToRender={2}
          removeClippedSubviews
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onScrollToIndexFailed={(info) => {
            // FlatList fallback: wait for layout then retry
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
