// src/components/Skeleton.tsx
// Shared animated skeleton for loading states across all FlashList pages

import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, View } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Core pulse animation ────────────────────────────────────────────────────
function usePulse() {
    const opacity = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.4,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [opacity]);
    return opacity;
}

const Box = ({
    w,
    h,
    rounded = 8,
    style,
}: {
    w: number | string;
    h: number;
    rounded?: number;
    style?: any;
}) => {
    const opacity = usePulse();
    return (
        <Animated.View
            style={[
                {
                    width: w as any,
                    height: h,
                    backgroundColor: "#E5E7EB",
                    borderRadius: rounded,
                    opacity,
                },
                style,
            ]}
        />
    );
};

// ─── Card types ──────────────────────────────────────────────────────────────

/** Full-screen vertical reel card (Home feed, profile-feed) */
export const FeedCardSkeleton = ({ height }: { height: number }) => (
    <View
        style={{ height, width: SCREEN_WIDTH, backgroundColor: "#F3F4F6", padding: 16 }}
    >
        {/* Top row: avatar + name */}
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
            <Box w={40} h={40} rounded={20} />
            <View style={{ marginLeft: 12 }}>
                <Box w={120} h={12} rounded={6} style={{ marginBottom: 6 }} />
                <Box w={80} h={10} rounded={6} />
            </View>
        </View>
        {/* Main image area */}
        <Box
            w="100%"
            h={height * 0.55}
            rounded={16}
            style={{ marginTop: 16 }}
        />
        {/* Info lines */}
        <Box w={180} h={14} rounded={7} style={{ marginTop: 14 }} />
        <Box w={100} h={12} rounded={6} style={{ marginTop: 8 }} />
    </View>
);

/** Horizontal list card (Profile page, connections list) */
export const HorizontalCardSkeleton = () => (
    <View
        style={{
            flexDirection: "row",
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 12,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: "#F3F4F6",
        }}
    >
        <Box w={96} h={96} rounded={12} />
        <View style={{ flex: 1, marginLeft: 12, justifyContent: "center" }}>
            <Box w="70%" h={13} rounded={6} style={{ marginBottom: 8 }} />
            <Box w="40%" h={11} rounded={6} style={{ marginBottom: 8 }} />
            <Box w="90%" h={10} rounded={6} style={{ marginBottom: 4 }} />
            <Box w="60%" h={10} rounded={6} />
        </View>
    </View>
);

/** 2-column grid card (Profile grid, search grid) */
export const GridCardSkeleton = ({ itemWidth }: { itemWidth: number }) => (
    <View
        style={{
            width: itemWidth,
            marginBottom: 12,
            backgroundColor: "#fff",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#F3F4F6",
            overflow: "hidden",
        }}
    >
        <Box w="100%" h={itemWidth} rounded={0} />
        <View style={{ padding: 10 }}>
            <Box w="80%" h={12} rounded={6} style={{ marginBottom: 6 }} />
            <Box w="50%" h={10} rounded={6} />
        </View>
    </View>
);

/** Single-row person card (Connections, requests) */
export const PersonCardSkeleton = () => (
    <View
        style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 12,
            backgroundColor: "#fff",
        }}
    >
        <Box w={52} h={52} rounded={26} />
        <View style={{ flex: 1, marginLeft: 12 }}>
            <Box w={130} h={13} rounded={6} style={{ marginBottom: 6 }} />
            <Box w={90} h={11} rounded={6} />
        </View>
        <Box w={80} h={32} rounded={8} />
    </View>
);

/** Search result card skeleton */
export const SearchCardSkeleton = () => (
    <View
        style={{
            flexDirection: "row",
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 12,
            marginHorizontal: 16,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: "#F3F4F6",
        }}
    >
        <Box w={90} h={90} rounded={12} />
        <View style={{ flex: 1, marginLeft: 12, justifyContent: "center" }}>
            <Box w="75%" h={13} rounded={6} style={{ marginBottom: 8 }} />
            <Box w="45%" h={11} rounded={6} style={{ marginBottom: 8 }} />
            <Box w="85%" h={10} rounded={6} />
        </View>
    </View>
);

/** Renders N skeletons of a given type */
export const SkeletonList = ({
    count = 6,
    type,
    itemWidth,
    feedHeight,
}: {
    count?: number;
    type: "feed" | "horizontal" | "person" | "search";
    itemWidth?: number;
    feedHeight?: number;
}) => {
    const items = Array.from({ length: count });
    return (
        <>
            {items.map((_, i) => {
                if (type === "feed") return <FeedCardSkeleton key={i} height={feedHeight ?? 600} />;
                if (type === "horizontal") return <HorizontalCardSkeleton key={i} />;
                if (type === "person") return <PersonCardSkeleton key={i} />;
                if (type === "search") return <SearchCardSkeleton key={i} />;
                return null;
            })}
        </>
    );
};
