import { useAuth } from "@/src/context/AuthContext";
import type { Product } from "@/src/types";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

const { width: SW, height: SH } = Dimensions.get("window");

let ImageView: any = null;
if (Platform.OS !== "web") {
  ImageView = require("react-native-image-viewing").default;
}

import { communications } from "@/src/utils/communications";

export const CARD_HEIGHT = 160;
const IMG_W = 140;
const THUMB_W = 100;
const THUMB_H = 80;

interface Props { item: Product }

const SearchProductCardInner: React.FC<Props> = ({ item }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIdx, setViewerIdx] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  // Stable derived values
  const images = useMemo(
    () => (item.images?.length ? item.images : [item.image || ""]),
    [item.images, item.image]
  );
  const viewerImgs = useMemo(() => images.map((uri) => ({ uri })), [images]);
  const desc: string = (item as any).description || "";
  const dealerName = item.dealerName || "Dealer";
  const avatar = useMemo(
    () =>
      item.dealerAvatar ||
      item.dealerPhoto ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(dealerName)}&background=6366f1&color=fff&bold=true`,
    [item.dealerAvatar, item.dealerPhoto, dealerName]
  );
  const priceStr = useMemo(
    () => `₹${Number(item.price).toLocaleString("en-IN")}`,
    [item.price]
  );

  // Stable callbacks
  const openModal = useCallback(() => setModalVisible(true), []);
  const closeModal = useCallback(() => setModalVisible(false), []);
  const closeViewer = useCallback(() => setViewerOpen(false), []);

  const openViewer = useCallback((idx: number) => {
    setViewerIdx(idx);
    setViewerOpen(true);
  }, []);

  const openWhatsApp = useCallback(() => {
    communications.askDealerForProduct(item.dealerPhone, item.name, desc, priceStr, item.id);
  }, [item.dealerPhone, item.name, desc, priceStr, item.id]);

  const onShare = useCallback(() => {
    communications.shareProduct(item.name, desc, priceStr, item.id);
  }, [item.name, desc, priceStr, item.id]);

  const goToProfile = useCallback(() => {
    const uid = item.userId || item.dealerId || (item as any).owner_id;
    if (!uid) return;
    const me = user?.id || (user as any)?.uid;
    closeModal();
    setTimeout(() => {
      router.push(
        (uid === me ? "/(dealer)/profile" : `/(dealer)/profile/${uid}`) as any
      );
    }, 350);
  }, [item.userId, item.dealerId, user, router, closeModal]);

  return (
    <>
      {/* ── Card ── */}
      <TouchableOpacity
        style={styles.wrapper}
        activeOpacity={0.88}
        onPress={openModal}
      >
        <View style={styles.card}>
          <View style={styles.row}>
            {/* Thumbnail */}
            <View style={styles.imgWrap}>
              {images[0] ? (
                <Image source={{ uri: images[0] }} style={styles.img} resizeMode="cover" />
              ) : (
                <View style={styles.imgPlaceholder}>
                  <Ionicons name="image-outline" size={28} color="#D1D5DB" />
                </View>
              )}
              {images.length > 1 && (
                <View style={styles.badge}>
                  <Ionicons name="images-outline" size={9} color="white" />
                  <Text style={styles.badgeText}>{images.length}</Text>
                </View>
              )}
              <LinearGradient
                pointerEvents="none"
                colors={["transparent", "rgba(0,0,0,0.28)"]}
                style={styles.imgGrad}
              />
            </View>

            {/* Info panel */}
            <View style={styles.info}>
              <View>
                <Text numberOfLines={2} style={styles.name}>{item.name}</Text>
                <Text style={styles.price}>{priceStr}</Text>
              </View>

              <View style={styles.dealerRow}>
                <Image source={{ uri: avatar }} style={styles.dealerAvatar} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={styles.dealerName}>{dealerName}</Text>
                  {!!item.city && (
                    <Text style={styles.city} numberOfLines={1}>{item.city}</Text>
                  )}
                </View>
              </View>

              <View style={styles.detailsHint}>
                <Text style={styles.detailsHintText}>Tap for details</Text>
                <Ionicons name="chevron-forward" size={11} color="#9CA3AF" />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* ── Bottom-sheet modal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        {/* Scrim — tap to close */}
        <Pressable style={sheet.scrim} onPress={closeModal}>
          {/* Sheet — absorb inner taps */}
          <Pressable style={sheet.sheet} onPress={() => { }}>
            {/* Handle */}
            <View style={sheet.handle} />

            {/* Header */}
            <View style={sheet.header}>
              <Text style={sheet.headerTitle} numberOfLines={1}>{item.name}</Text>
              <View style={sheet.headerActions}>
                <TouchableOpacity onPress={onShare} style={sheet.iconBtn} activeOpacity={0.75}>
                  <Ionicons name="share-outline" size={18} color="#374151" />
                </TouchableOpacity>
                <TouchableOpacity onPress={closeModal} style={sheet.iconBtn} activeOpacity={0.75}>
                  <Ionicons name="close" size={18} color="#374151" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={sheet.scrollContent}
              bounces
              alwaysBounceVertical
              overScrollMode="always"
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {/* Image thumbnail strip */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={sheet.thumbsRow}
                overScrollMode="never"
              >
                {images.map((uri: string, i: number) => (
                  <TouchableOpacity
                    key={`thumb-${item.id}-${i}`}
                    onPress={() => openViewer(i)}
                    activeOpacity={0.85}
                    style={sheet.thumbWrap}
                  >
                    {uri ? (
                      <Image source={{ uri }} style={sheet.thumb} resizeMode="cover" />
                    ) : (
                      <View style={[sheet.thumb, sheet.thumbEmpty]}>
                        <Ionicons name="image-outline" size={22} color="#D1D5DB" />
                      </View>
                    )}
                    <View style={sheet.expandOverlay}>
                      <Ionicons name="expand-outline" size={12} color="white" />
                    </View>
                    {i === 0 && images.length > 1 && (
                      <View style={sheet.thumbBadge}>
                        <Text style={sheet.thumbBadgeText}>{images.length} photos</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Price + tags */}
              <View style={sheet.priceRow}>
                <Text style={sheet.productPrice}>{priceStr}</Text>
                <View style={sheet.tagsRow}>
                  {item.category && (
                    <View style={sheet.tag}>
                      <Text style={sheet.tagText}>{item.category}</Text>
                    </View>
                  )}
                  {item.city && (
                    <View style={sheet.tag}>
                      <Ionicons name="location-outline" size={10} color="#6366F1" />
                      <Text style={sheet.tagText}>{item.city}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Description */}
              {!!desc && (
                <>
                  <View style={sheet.divider} />
                  <Text style={sheet.sectionLabel}>Description</Text>
                  <Text style={sheet.descText}>{desc}</Text>
                </>
              )}

              {/* Dealer */}
              <View style={sheet.divider} />
              <Text style={sheet.sectionLabel}>Sold by</Text>
              <TouchableOpacity
                style={sheet.dealerCard}
                onPress={goToProfile}
                activeOpacity={0.82}
              >
                <Image source={{ uri: avatar }} style={sheet.dealerAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={sheet.dealerName}>{dealerName}</Text>
                  {!!item.city && <Text style={sheet.dealerCity}>{item.city}</Text>}
                </View>
                <View style={sheet.viewChip}>
                  <Text style={sheet.viewChipText}>Profile</Text>
                  <Ionicons name="chevron-forward" size={12} color="#6366F1" />
                </View>
              </TouchableOpacity>

              {/* CTA */}
              <View style={sheet.divider} />
              <View style={sheet.ctaRow}>
                <TouchableOpacity
                  style={sheet.btnWA}
                  onPress={openWhatsApp}
                  activeOpacity={0.82}
                >
                  <FontAwesome5 name="whatsapp" size={20} color="white" />
                  <Text style={sheet.btnWAText}>WhatsApp Dealer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={sheet.btnIconShare}
                  onPress={onShare}
                  activeOpacity={0.82}
                >
                  <Ionicons name="share-social-outline" size={18} color="#4F46E5" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Full-screen image viewer */}
      {ImageView && (
        <ImageView
          images={viewerImgs}
          imageIndex={viewerIdx}
          visible={viewerOpen}
          onRequestClose={closeViewer}
        />
      )}
    </>
  );
};

// Memoize to avoid re-renders when the parent list re-renders
export const SearchProductCard = React.memo(SearchProductCardInner);
export const CARD_WIDTH = SW;

/* ─────────────────────────────────────────
   CARD STYLES
───────────────────────────────────────── */
const styles = StyleSheet.create({
  wrapper: {
    width: SW,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    height: CARD_HEIGHT,
  },
  imgWrap: {
    width: IMG_W,
    height: "100%",
    backgroundColor: "#F0F0F0",
  },
  img: { width: IMG_W, height: CARD_HEIGHT },
  imgPlaceholder: {
    width: IMG_W,
    height: CARD_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },
  imgGrad: {
    position: "absolute",
    left: 0, right: 0, bottom: 0, height: 40,
  },
  badge: {
    position: "absolute",
    top: 7, right: 7,
    backgroundColor: "rgba(0,0,0,0.52)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  badgeText: { color: "white", fontSize: 10, fontWeight: "700" },
  info: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  name: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 13.5,
    lineHeight: 18,
    letterSpacing: -0.3,
  },
  price: {
    color: "#059669",
    fontWeight: "900",
    fontSize: 18,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  dealerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  dealerAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#F3F4F6",
  },
  dealerName: {
    fontSize: 11.5,
    color: "#374151",
    fontWeight: "700",
  },
  city: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  detailsHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  detailsHintText: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "500",
  },
});

/* ─────────────────────────────────────────
   BOTTOM SHEET STYLES
───────────────────────────────────────── */
const sheet = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: SH * 0.70,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    alignSelf: "center",
    marginTop: 10,
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
    marginRight: 8,
  },
  headerActions: {
    flexDirection: "row",
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 30,
  },
  thumbsRow: {
    paddingHorizontal: 18,
    gap: 10,
    paddingBottom: 4,
  },
  thumbWrap: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  thumb: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: 12,
  },
  thumbEmpty: {
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  expandOverlay: {
    position: "absolute",
    bottom: 5, right: 5,
    width: 20, height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbBadge: {
    position: "absolute",
    top: 5, left: 5,
    backgroundColor: "rgba(0,0,0,0.52)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  thumbBadgeText: { color: "white", fontSize: 9, fontWeight: "700" },
  priceRow: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  productPrice: {
    fontSize: 26,
    fontWeight: "900",
    color: "#059669",
    letterSpacing: -1,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 8,
    flexWrap: "wrap",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4F46E5",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E7EB",
    marginVertical: 14,
    marginHorizontal: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    paddingHorizontal: 18,
  },
  descText: {
    fontSize: 13.5,
    color: "#374151",
    lineHeight: 21,
    paddingHorizontal: 18,
  },
  dealerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 18,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dealerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#F3F4F6",
  },
  dealerName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#111827",
  },
  dealerCity: {
    fontSize: 11.5,
    color: "#9CA3AF",
    fontWeight: "500",
    marginTop: 1,
  },
  viewChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  viewChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6366F1",
  },
  ctaRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
  },
  btnWA: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#25D366",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#25D366",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  btnWAText: {
    color: "white",
    fontWeight: "800",
    fontSize: 13.5,
  },
  btnIconShare: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
});
