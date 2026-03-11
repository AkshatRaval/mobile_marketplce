// src/components/ProductDetailSheet.tsx
// Full-screen product detail bottom sheet — shown when a search card is tapped.
// Mimics the FeedProductCard / ProductCard design with image slider, price, description,
// WhatsApp CTA and View Profile button.

import type { Product } from "@/src/types";
import { communications } from "@/src/utils/communications";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Image,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SW, height: SH } = Dimensions.get("window");

interface ProductDetailSheetProps {
    product: Product | null;
    onClose: () => void;
}

export const ProductDetailSheet: React.FC<ProductDetailSheetProps> = ({
    product,
    onClose,
}) => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const slideY = useRef(new Animated.Value(SH)).current;
    const [activeIndex, setActiveIndex] = useState(0);
    const [descExpanded, setDescExpanded] = useState(false);

    const visible = !!product;

    // ── animate in/out ─────────────────────────────────────
    React.useEffect(() => {
        if (visible) {
            Animated.spring(slideY, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 3,
                speed: 14,
            }).start();
        } else {
            slideY.setValue(SH);
            setActiveIndex(0);
            setDescExpanded(false);
        }
    }, [visible]);

    const handleClose = () => {
        Animated.timing(slideY, {
            toValue: SH,
            duration: 240,
            useNativeDriver: true,
        }).start(() => onClose());
    };

    if (!product) return null;

    const images =
        product.images?.length > 0
            ? product.images
            : product.image
                ? [product.image]
                : [];

    const dealerName = product.dealerName || "Dealer";
    const dealerAvatar =
        product.dealerAvatar ||
        product.dealerPhoto ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(dealerName)}&background=random&color=fff`;

    const handleWhatsApp = () => {
        communications.askDealerForProduct(product.dealerPhone, product.name, product.description || "", `₹${Number(product.price).toLocaleString("en-IN")}`, product.id);
    };

    const handleViewProfile = () => {
        const uid = product.userId || (product as any).dealerId;
        if (!uid) return;
        handleClose();
        setTimeout(() => router.push(`/(dealer)/profile/${uid}` as any), 300);
    };

    const handleShare = () => {
        communications.shareProduct(product.name, product.description || "", `₹${Number(product.price).toLocaleString("en-IN")}`, product.id);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            {/* Dim overlay */}
            <Pressable style={styles.overlay} onPress={handleClose} />

            <Animated.View
                style={[
                    styles.sheet,
                    { paddingBottom: insets.bottom + 16, transform: [{ translateY: slideY }] },
                ]}
            >
                {/* ── IMAGE SLIDER ── */}
                <View style={{ height: SH * 0.52, backgroundColor: "#000", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" }}>
                    {images.length > 0 ? (
                        <FlashList
                            data={images}
                            horizontal
                            pagingEnabled
                            keyExtractor={(_, i) => `img-${i}`}
                            showsHorizontalScrollIndicator={false}
                            onViewableItemsChanged={({ viewableItems }: { viewableItems: ViewToken[] }) => {
                                if (viewableItems[0]?.index != null) setActiveIndex(viewableItems[0].index);
                            }}
                            viewabilityConfig={{ viewAreaCoveragePercentThreshold: 60 }}
                            renderItem={({ item: uri }: { item: string }) => (
                                <Image
                                    source={{ uri }}
                                    style={{ width: SW, height: SH * 0.52 }}
                                    resizeMode="cover"
                                />
                            )}
                        />
                    ) : (
                        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#1C1C1E" }}>
                            <Ionicons name="image-outline" size={56} color="#555" />
                        </View>
                    )}

                    {/* Gradient overlay */}
                    <LinearGradient
                        pointerEvents="none"
                        colors={["rgba(0,0,0,0.55)", "transparent", "transparent", "rgba(0,0,0,0.4)"]}
                        locations={[0, 0.2, 0.7, 1]}
                        style={StyleSheet.absoluteFillObject}
                    />

                    {/* Top bar: close + image counter */}
                    <View style={[styles.topBar, { paddingTop: (Platform.OS === "android" ? 44 : 56) }]}>
                        <TouchableOpacity onPress={handleClose} style={styles.iconBtn} activeOpacity={0.75}>
                            <Ionicons name="chevron-down" size={22} color="white" />
                        </TouchableOpacity>
                        {images.length > 1 && (
                            <View style={styles.counterPill}>
                                <Text style={styles.counterText}>{activeIndex + 1} / {images.length}</Text>
                            </View>
                        )}
                        <TouchableOpacity onPress={handleShare} style={styles.iconBtn} activeOpacity={0.75}>
                            <Ionicons name="share-outline" size={20} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Image dots */}
                    {images.length > 1 && (
                        <View style={styles.dotRow}>
                            {images.map((_: string, i: number) => (
                                <View
                                    key={i}
                                    style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
                                />
                            ))}
                        </View>
                    )}
                </View>

                {/* ── CONTENT PANEL ── */}
                <View style={{ backgroundColor: "#fff", flex: 1, paddingHorizontal: 20, paddingTop: 20 }}>
                    {/* Dealer row */}
                    <TouchableOpacity
                        onPress={handleViewProfile}
                        activeOpacity={0.75}
                        style={styles.dealerRow}
                    >
                        <Image source={{ uri: dealerAvatar }} style={styles.dealerAvatar} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.dealerName} numberOfLines={1}>{dealerName}</Text>
                            {product.city ? (
                                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                                    <Ionicons name="location-sharp" size={10} color="#9CA3AF" />
                                    <Text style={styles.dealerCity}>{product.city}</Text>
                                </View>
                            ) : null}
                        </View>
                        <View style={styles.profileBtn}>
                            <Text style={styles.profileBtnText}>View Shop</Text>
                            <Ionicons name="chevron-forward" size={12} color="#4F46E5" />
                        </View>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={{ height: 1, backgroundColor: "#F1F1F5", marginVertical: 14 }} />

                    {/* Title + Price */}
                    <Text style={styles.productName} numberOfLines={3}>{product.name}</Text>
                    <Text style={styles.productPrice}>₹{Number(product.price).toLocaleString("en-IN")}</Text>

                    {/* Description */}
                    {product.description ? (
                        <Pressable onPress={() => setDescExpanded((v) => !v)} style={{ marginTop: 10 }}>
                            <Text numberOfLines={descExpanded ? 8 : 2} style={styles.descText}>
                                {product.description}
                            </Text>
                            {(product.description?.length || 0) > 80 && (
                                <Text style={styles.moreText}>{descExpanded ? "Show less" : "...more"}</Text>
                            )}
                        </Pressable>
                    ) : null}

                    {/* ── ACTIONS ── */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            onPress={handleWhatsApp}
                            activeOpacity={0.85}
                            style={styles.whatsAppBtn}
                        >
                            <Ionicons name="logo-whatsapp" size={20} color="white" />
                            <Text style={styles.whatsAppBtnText}>Chat on WhatsApp</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleViewProfile}
                            activeOpacity={0.8}
                            style={styles.shopBtn}
                        >
                            <Ionicons name="storefront-outline" size={20} color="#4F46E5" />
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.55)",
    },
    sheet: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#fff",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: "hidden",
        maxHeight: SH * 0.92,
    },
    topBar: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(0,0,0,0.4)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.15)",
    },
    counterPill: {
        backgroundColor: "rgba(0,0,0,0.45)",
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.18)",
    },
    counterText: { color: "white", fontSize: 13, fontWeight: "600" },
    dotRow: {
        position: "absolute",
        bottom: 16,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "center",
        gap: 5,
    },
    dot: { borderRadius: 4, height: 4 },
    dotActive: { width: 20, backgroundColor: "rgba(255,255,255,0.95)" },
    dotInactive: { width: 6, backgroundColor: "rgba(255,255,255,0.4)" },
    dealerRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    dealerAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 2,
        borderColor: "#EEF2FF",
        backgroundColor: "#F3F4F6",
    },
    dealerName: {
        fontSize: 14,
        fontWeight: "800",
        color: "#111827",
        letterSpacing: -0.2,
    },
    dealerCity: {
        fontSize: 11,
        color: "#9CA3AF",
        fontWeight: "500",
        marginLeft: 3,
    },
    profileBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EEF2FF",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 4,
    },
    profileBtnText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#4F46E5",
    },
    productName: {
        fontSize: 22,
        fontWeight: "900",
        color: "#111827",
        lineHeight: 28,
        letterSpacing: -0.4,
    },
    productPrice: {
        fontSize: 26,
        fontWeight: "900",
        color: "#059669",
        marginTop: 6,
        letterSpacing: -0.5,
    },
    descText: {
        fontSize: 14,
        color: "#6B7280",
        lineHeight: 20,
        fontWeight: "400",
    },
    moreText: {
        fontSize: 12,
        color: "#9CA3AF",
        fontWeight: "700",
        marginTop: 3,
    },
    actionRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: "auto",
        paddingTop: 20,
    },
    whatsAppBtn: {
        flex: 1,
        backgroundColor: "#25D366",
        height: 52,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        shadowColor: "#25D366",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    whatsAppBtnText: {
        color: "white",
        fontWeight: "800",
        fontSize: 15,
        letterSpacing: 0.1,
    },
    shopBtn: {
        width: 52,
        height: 52,
        backgroundColor: "#EEF2FF",
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: "#C7D2FE",
    },
});
