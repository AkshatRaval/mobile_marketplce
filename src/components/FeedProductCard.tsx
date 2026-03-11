import { BarcodeScannerModal } from "@/src/components/BarcodeScannerModal";
import { CustomDialog } from "@/src/components/CustomDialog";
import { useAuth } from "@/src/context/AuthContext";
import { useProfileActions } from "@/src/hooks/useProfileActions";
import { useProfileData } from "@/src/hooks/useProfileData";
import { communications } from "@/src/utils/communications";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";

const { width: SW } = Dimensions.get("window");

interface FeedProductCardProps {
  item: any;
  height: number;
  width?: number;
  dealerPhone?: string;
  onClose: () => void;
  onDeleted?: (id: string) => void;
  onUpdated?: (id: string, updates: any) => void;
}

const FeedProductCardInner: React.FC<FeedProductCardProps> = ({
  item,
  height,
  width: cardWidth,
  dealerPhone,
  onClose,
  onDeleted,
  onUpdated,
}) => {
  const W = cardWidth ?? SW;
  const { user } = useAuth();
  const isOwner = user?.id === item.userId;
  
  const { profileData, refetch } = useProfileData(user?.id);
  const { deleteProduct, updateProduct, recordSale } = useProfileActions(
    user?.id,
    profileData,
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isMarkAsSoldVisible, setIsMarkAsSoldVisible] = useState(false);
  const [isSalesLogModalVisible, setIsSalesLogModalVisible] = useState(false);

  // New CustomDialog states
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [fastSaleDialogVisible, setFastSaleDialogVisible] = useState(false);

  const [editForm, setEditForm] = useState({
    name: item.name || "",
    price: item.price?.toString() || "",
    description: item.description || "",
  });

  const [saleInfo, setSaleInfo] = useState({
    soldPrice: "",
    buyerName: "",
    buyerPhone: "",
    imei1: "",
    imei2: "",
  });

  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanTarget, setScanTarget] = useState<"imei1" | "imei2">("imei1");

  const images = useMemo(
    () => (item.images?.length > 0 ? item.images : item.image ? [item.image] : []),
    [item.images, item.image]
  );

  const priceStr = useMemo(
    () => `₹${Number(item.price).toLocaleString("en-IN")}`,
    [item.price]
  );

  const condition = useMemo(() =>
    item.condition
      ? item.condition.charAt(0).toUpperCase() + item.condition.slice(1)
      : null,
    [item.condition]
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) setActiveIndex(viewableItems[0].index);
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  const openScanner = useCallback((target: "imei1" | "imei2") => {
    setScanTarget(target);
    setScannerVisible(true);
  }, []);

  const handleBarcodeScan = useCallback((value: string) => {
    setScannerVisible(false);
    setSaleInfo((prev) => ({ ...prev, [scanTarget]: value }));
  }, [scanTarget]);

  const handleSaveEdit = useCallback(async () => {
    const success = await updateProduct(item.id, editForm);
    if (success) {
      setIsEditModalVisible(false);
      onUpdated?.(item.id, editForm);
      refetch();
    }
  }, [item.id, editForm, updateProduct, onUpdated, refetch]);

  const handleFastSale = useCallback(() => {
    setIsMarkAsSoldVisible(false);
    // Slight delay to allow bottom sheet closing animation before dialog pop
    setTimeout(() => setFastSaleDialogVisible(true), 300);
  }, []);

  const confirmFastSale = useCallback(async () => {
    setFastSaleDialogVisible(false);
    const success = await recordSale(item, { type: "fast", soldPrice: item.price.toString() });
    if (success) { 
      onDeleted?.(item.id); 
      onClose(); 
      refetch(); 
    }
  }, [item, recordSale, onDeleted, onClose, refetch]);

  const handleSubmitSalesLog = useCallback(async () => {
    if (!saleInfo.soldPrice) return Alert.alert("Error", "Sold price is required");
    const success = await recordSale(item, {
      type: "detailed",
      soldPrice: saleInfo.soldPrice,
      buyerName: saleInfo.buyerName,
      buyerPhone: saleInfo.buyerPhone,
      imei: saleInfo.imei1,
      imei2: saleInfo.imei2,
    });
    if (success) {
      setIsSalesLogModalVisible(false);
      setSaleInfo({ soldPrice: "", buyerName: "", buyerPhone: "", imei1: "", imei2: "" });
      onDeleted?.(item.id); onClose(); refetch();
    }
  }, [item, saleInfo, recordSale, onDeleted, onClose, refetch]);

  const handleDelete = useCallback(() => {
    setDeleteDialogVisible(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    setDeleteDialogVisible(false);
    const success = await deleteProduct(item.id, item.images);
    if (success) { 
      onDeleted?.(item.id); 
      onClose(); 
      refetch(); 
    }
  }, [item, deleteProduct, onDeleted, onClose, refetch]);

  const openWhatsApp = useCallback(() => {
    communications.askDealerForProduct(dealerPhone || item.dealerPhone, item.name, item.description || "", priceStr, item.id);
  }, [dealerPhone, item.dealerPhone, item.name, item.description, priceStr, item.id]);

  const onShare = useCallback(() => {
    communications.shareProduct(item.name, item.description || "", priceStr, item.id);
  }, [item.name, item.description, priceStr, item.id]);


  return (
    <View style={{ height, width: W, backgroundColor: "#0A0A0A" }}>
      <StatusBar hidden />

      {/* ══════════════════════════════════
          HORIZONTAL IMAGE SWIPER
      ══════════════════════════════════ */}
      {images.length > 0 ? (
        <FlashList
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          keyExtractor={(_: any, i: number) => `${item.id}-img-${i}`}
          renderItem={({ item: uri }: { item: string }) => (
            <Image source={{ uri }} style={{ width: W, height }} resizeMode="cover" />
          )}
        />
      ) : (
        <View style={{ width: W, height, backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="image-outline" size={64} color="#333" />
        </View>
      )}

      {/* Top gradient */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.65)", "transparent"]}
        style={s.topGrad}
      />

      {/* Bottom gradient */}
      <LinearGradient
        pointerEvents="none"
        colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.96)"]}
        locations={[0, 0.35, 1]}
        style={[s.bottomGrad, { height: height * 0.55 }]}
      />

      {/* ══════════════════════════════════
          TOP BAR
      ══════════════════════════════════ */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={onClose} style={s.glassBtn} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={22} color="white" />
        </TouchableOpacity>

        {images.length > 1 && (
          <View style={s.counterPill}>
            <Ionicons name="images-outline" size={11} color="rgba(255,255,255,0.8)" />
            <Text style={s.counterText}>{activeIndex + 1} / {images.length}</Text>
          </View>
        )}

        {/* spacer to keep counter centered */}
        <View style={{ width: 40 }} />
      </View>

      {/* Image dots */}
      {images.length > 1 && (
        <View style={s.dotRow}>
          {images.map((_: any, i: number) => (
            <View key={i} style={[s.dot, i === activeIndex ? s.dotActive : s.dotOff]} />
          ))}
        </View>
      )}

      {/* ══════════════════════════════════
          BOTTOM OVERLAY
      ══════════════════════════════════ */}
      <View style={s.bottom}>

        {/* Condition chip */}
        {condition && (
          <View style={s.conditionPill}>
            <View style={[s.condDot, { backgroundColor: condition === "New" ? "#22C55E" : "#F59E0B" }]} />
            <Text style={s.conditionText}>{condition}</Text>
          </View>
        )}

        {/* Product name */}
        <Text style={s.productName} numberOfLines={2}>{item.name}</Text>

        {/* Price */}
        <View style={s.priceRow}>
          <Text style={s.priceText}>{priceStr}</Text>
          {item.originalPrice && item.originalPrice > item.price && (
            <Text style={s.originalPrice}>
              ₹{Number(item.originalPrice).toLocaleString("en-IN")}
            </Text>
          )}
        </View>

        {/* Description */}
        {item.description && (
          <Pressable onPress={() => setExpanded((v) => !v)}>
            <Text numberOfLines={expanded ? 6 : 2} style={s.descText}>{item.description}</Text>
            {(item.description?.length || 0) > 80 && (
              <Text style={s.readMore}>{expanded ? "Show less" : "...more"}</Text>
            )}
          </Pressable>
        )}

        {/* Action buttons */}
        <View style={s.actionRow}>
          {!isOwner ? (
            <TouchableOpacity style={s.btnWA} onPress={openWhatsApp} activeOpacity={0.85}>
              <FontAwesome5 name="whatsapp" size={18} color="white" />
              <Text style={s.btnWAText}>WhatsApp</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={s.btnManage} onPress={() => setIsEditModalVisible(true)} activeOpacity={0.85}>
                <Ionicons name="create-outline" size={17} color="white" />
                <Text style={s.btnManageText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.btnManage} onPress={() => setIsMarkAsSoldVisible(true)} activeOpacity={0.85}>
                <Ionicons name="checkmark-done" size={17} color="white" />
                <Text style={s.btnManageText}>Sold</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.btnShare} onPress={handleDelete} activeOpacity={0.85}>
                <Ionicons name="trash-outline" size={18} color="white" />
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={s.btnShare} onPress={onShare} activeOpacity={0.85}>
            <Ionicons name="share-social-outline" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ══════════════════════════════════
          EDIT MODAL
      ══════════════════════════════════ */}
      <Modal visible={isEditModalVisible} transparent animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}>
        <Pressable style={s.overlay} onPress={() => setIsEditModalVisible(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={s.fullSheet}>
              <View style={s.sheetHandle} />
              <Text style={s.fullSheetTitle}>Edit Details</Text>
              <TextInput style={s.input} placeholder="Product Name" placeholderTextColor="#9CA3AF"
                value={editForm.name} onChangeText={(t) => setEditForm({ ...editForm, name: t })} />
              <TextInput style={s.input} placeholder="Price (₹)" placeholderTextColor="#9CA3AF"
                keyboardType="numeric" value={editForm.price}
                onChangeText={(t) => setEditForm({ ...editForm, price: t })} />
              <TextInput style={[s.input, { height: 100, textAlignVertical: "top" }]}
                placeholder="Description" placeholderTextColor="#9CA3AF" multiline
                value={editForm.description} onChangeText={(t) => setEditForm({ ...editForm, description: t })} />
              <TouchableOpacity style={s.primaryBtn} activeOpacity={0.8} onPress={handleSaveEdit}>
                <Text style={s.primaryBtnText}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.ghostBtn} onPress={() => setIsEditModalVisible(false)}>
                <Text style={s.ghostBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ══════════════════════════════════
          MARK AS SOLD
      ══════════════════════════════════ */}
      <Modal visible={isMarkAsSoldVisible} transparent animationType="slide"
        onRequestClose={() => setIsMarkAsSoldVisible(false)}>
        <Pressable style={s.overlay} onPress={() => setIsMarkAsSoldVisible(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={s.fullSheet}>
              <View style={s.sheetHandle} />
              <Text style={s.fullSheetTitle}>Mark as Sold</Text>
              <View style={{ flexDirection: "row", gap: 14, marginTop: 8 }}>
                <TouchableOpacity onPress={handleFastSale} activeOpacity={0.8} style={s.soldBtn}>
                  <Ionicons name="flash-outline" size={32} color="black" />
                  <Text style={s.soldBtnText}>Fast Sale</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setIsMarkAsSoldVisible(false); setIsSalesLogModalVisible(true); }}
                  activeOpacity={0.8} style={[s.soldBtn, { backgroundColor: "#4F46E5" }]}>
                  <Ionicons name="receipt-outline" size={32} color="white" />
                  <Text style={[s.soldBtnText, { color: "white" }]}>Save Logs</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={[s.ghostBtn, { marginTop: 24 }]} onPress={() => setIsMarkAsSoldVisible(false)}>
                <Text style={s.ghostBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ══════════════════════════════════
          SALES LOG MODAL
      ══════════════════════════════════ */}
      <Modal visible={isSalesLogModalVisible} transparent animationType="slide"
        onRequestClose={() => setIsSalesLogModalVisible(false)}>
        <Pressable style={s.overlay} onPress={() => setIsSalesLogModalVisible(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={s.fullSheet}>
              <View style={s.sheetHandle} />
              <Text style={s.fullSheetTitle}>Sale Information</Text>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <TextInput style={s.input} placeholder="Final Sale Price (₹)" placeholderTextColor="#9CA3AF"
                  keyboardType="numeric" value={saleInfo.soldPrice}
                  onChangeText={(t) => setSaleInfo({ ...saleInfo, soldPrice: t })} />
                <TextInput style={s.input} placeholder="Customer Name" placeholderTextColor="#9CA3AF"
                  value={saleInfo.buyerName} onChangeText={(t) => setSaleInfo({ ...saleInfo, buyerName: t })} />
                <TextInput style={s.input} placeholder="Customer Phone" placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad" value={saleInfo.buyerPhone}
                  onChangeText={(t) => setSaleInfo({ ...saleInfo, buyerPhone: t })} />
                <View style={s.imeiRow}>
                  <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} placeholder="IMEI 1 (optional)"
                    placeholderTextColor="#9CA3AF" value={saleInfo.imei1}
                    onChangeText={(t) => setSaleInfo({ ...saleInfo, imei1: t })} />
                  <TouchableOpacity onPress={() => openScanner("imei1")} style={s.scanBtn}>
                    <Ionicons name="barcode-outline" size={22} color="white" />
                  </TouchableOpacity>
                </View>
                <View style={s.imeiRow}>
                  <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} placeholder="IMEI 2 (optional)"
                    placeholderTextColor="#9CA3AF" value={saleInfo.imei2}
                    onChangeText={(t) => setSaleInfo({ ...saleInfo, imei2: t })} />
                  <TouchableOpacity onPress={() => openScanner("imei2")} style={[s.scanBtn, { backgroundColor: "#6B7280" }]}>
                    <Ionicons name="barcode-outline" size={22} color="white" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={s.primaryBtn} activeOpacity={0.8} onPress={handleSubmitSalesLog}>
                  <Text style={s.primaryBtnText}>Complete Record</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.ghostBtn} onPress={() => setIsSalesLogModalVisible(false)}>
                  <Text style={s.ghostBtnText}>Go Back</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <CustomDialog
        visible={deleteDialogVisible}
        title="Delete Listing"
        message={`Are you sure you want to permanently delete "${item.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        onCancel={() => setDeleteDialogVisible(false)}
        onConfirm={confirmDelete}
      />

      <CustomDialog
        visible={fastSaleDialogVisible}
        title="Fast Sale"
        message="Mark this listing as Sold instantly and remove it from search results?"
        confirmText="Mark Sold"
        cancelText="Cancel"
        isDestructive={false}
        onCancel={() => setFastSaleDialogVisible(false)}
        onConfirm={confirmFastSale}
      />

      <BarcodeScannerModal
        visible={scannerVisible}
        onScan={handleBarcodeScan}
        onClose={() => setScannerVisible(false)}
        label={scanTarget === "imei1" ? "Scan IMEI 1" : "Scan IMEI 2"}
      />
    </View>
  );
};

export const FeedProductCard = React.memo(FeedProductCardInner);

/* ─────────────────────────── STYLES ─────────────────────────── */
const s = StyleSheet.create({
  topGrad: { position: "absolute", left: 0, right: 0, top: 0, height: 140 },
  bottomGrad: { position: "absolute", left: 0, right: 0, bottom: 0 },
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 14,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  glassBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.38)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
  },
  counterPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.16)",
  },
  counterText: { color: "white", fontSize: 12, fontWeight: "600" },
  dotRow: {
    position: "absolute", bottom: 220, left: 0, right: 0,
    flexDirection: "row", justifyContent: "center", gap: 5,
  },
  dot: { borderRadius: 4, height: 4 },
  dotActive: { width: 22, backgroundColor: "rgba(255,255,255,0.95)" },
  dotOff: { width: 6, backgroundColor: "rgba(255,255,255,0.35)" },
  bottom: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "android" ? 24 : 32,
  },
  conditionPill: {
    flexDirection: "row", alignItems: "center", alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5, marginBottom: 10, gap: 5,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
  },
  condDot: { width: 7, height: 7, borderRadius: 4 },
  conditionText: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "600" },
  productName: {
    color: "#FFFFFF", fontWeight: "900", fontSize: 26,
    lineHeight: 32, letterSpacing: -0.5, marginBottom: 6,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 8 },
  priceText: { color: "#FBBF24", fontSize: 24, fontWeight: "800" },
  originalPrice: {
    color: "rgba(255,255,255,0.4)", fontSize: 15,
    fontWeight: "600", textDecorationLine: "line-through",
  },
  descText: { color: "#D1D5DB", fontSize: 13, lineHeight: 18 },
  readMore: { color: "#9CA3AF", fontSize: 11, fontWeight: "700", marginTop: 4, marginBottom: 6 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  btnWA: {
    flex: 1, height: 48, borderRadius: 14,
    backgroundColor: "#25D366",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: "#25D366", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  btnWAText: { color: "white", fontWeight: "800", fontSize: 14 },
  btnShare: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.13)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
  },
  btnManage: {
    flex: 1, height: 48, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.13)",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
  },
  btnManageText: { color: "white", fontWeight: "700", fontSize: 14 },
  // Modals
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.48)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingBottom: Platform.OS === "android" ? 24 : 42, paddingHorizontal: 20,
  },
  sheetHandle: {
    width: 38, height: 4, backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: 2, alignSelf: "center", marginBottom: 18,
  },
  sheetTitle: { color: "rgba(0,0,0,0.4)", fontSize: 13, fontWeight: "600", marginBottom: 16 },
  sheetOption: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "rgba(0,0,0,0.08)",
  },
  optIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  optTitle: { color: "#111", fontSize: 16, fontWeight: "700" },
  optSub: { color: "rgba(0,0,0,0.4)", fontSize: 12, marginTop: 2 },
  cancelBtn: {
    marginTop: 14, paddingVertical: 14, backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 14, alignItems: "center",
  },
  cancelText: { color: "#111", fontWeight: "700", fontSize: 16 },
  fullSheet: {
    backgroundColor: "#FFF", borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 28, paddingBottom: Platform.OS === "android" ? 28 : 44,
  },
  fullSheetTitle: { fontSize: 22, fontWeight: "900", color: "#111", marginBottom: 20, textAlign: "center" },
  input: {
    backgroundColor: "#F3F4F6", borderRadius: 16, padding: 16,
    fontSize: 15, fontWeight: "600", marginBottom: 12, color: "#111",
  },
  imeiRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  scanBtn: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: "#4F46E5",
    alignItems: "center", justifyContent: "center",
  },
  primaryBtn: {
    backgroundColor: "#111", borderRadius: 16, paddingVertical: 18, alignItems: "center", marginTop: 8,
  },
  primaryBtnText: { color: "white", fontWeight: "900", fontSize: 16 },
  ghostBtn: { paddingVertical: 14, alignItems: "center", marginTop: 4 },
  ghostBtnText: { color: "#9CA3AF", fontWeight: "700", fontSize: 15 },
  soldBtn: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 24, padding: 24, alignItems: "center" },
  soldBtnText: { fontWeight: "900", fontSize: 11, textTransform: "uppercase", marginTop: 10, color: "#111" },
});
