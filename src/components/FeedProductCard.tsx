import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  ViewToken
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface FeedProductCardProps {
  item: any;
  height: number;
  onClose: () => void;
  onPressOptions: () => void;
}

export const FeedProductCard: React.FC<FeedProductCardProps> = ({
  item,
  height,
  onClose,
  onPressOptions,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setActiveIndex(viewableItems[0].index);
        // Subtle fade animation on image change
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.5,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 60,
  }).current;

  // Get images array
  const images =
    item.images?.length > 0 ? item.images : item.image ? [item.image] : [];

  return (
    <View style={{ height, width: SCREEN_WIDTH }} className="bg-black">
      <StatusBar hidden />

      {/* IMAGE SLIDER */}
      <FlashList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        keyExtractor={(_, index) => `${item.id}-${index}`}
        renderItem={({ item: imgUri }) => (
          <Pressable style={{ width: SCREEN_WIDTH }}>
            <Image
              source={{ uri: imgUri }}
              style={{ width: "100%", height }}
              resizeMode="cover"
            />
          </Pressable>
        )}
      />

      {/* ELEGANT GRADIENT OVERLAYS */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.7)", "transparent"]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 180,
        }}
      />

      <LinearGradient
        pointerEvents="none"
        colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.98)"]}
        locations={[0, 0.5, 1]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: height * 0.45,
        }}
      />

      {/* REFINED TOP BAR */}
      <BlurView
        intensity={40}
        tint="dark"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          paddingTop: 50,
          paddingBottom: 16,
          paddingHorizontal: 20,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={onClose}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(0,0,0,0.6)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.15)",
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onPressOptions}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(0,0,0,0.6)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.15)",
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color="white" />
        </TouchableOpacity>
      </BlurView>

      {/* BEAUTIFUL IMAGE INDICATORS */}
      {images.length > 1 && (
        <View
          style={{
            position: "absolute",
            top: 120,
            left: 0,
            right: 0,
            flexDirection: "row",
            justifyContent: "center",
            gap: 4,
            paddingHorizontal: 20,
          }}
        >
          {images.map((_: any, i: any) => (
            <View
              key={i}
              style={{
                flex: i === activeIndex ? 1 : 0,
                height: 3,
                borderRadius: 2,
                backgroundColor:
                  i === activeIndex
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(255,255,255,0.3)",
                width: i === activeIndex ? undefined : 3,
                maxWidth: i === activeIndex ? 100 : 3,
              }}
            />
          ))}
        </View>
      )}

      {/* STUNNING BOTTOM CONTENT */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 24,
          paddingBottom: 50,
        }}
      >
        {/* PRODUCT NAME */}
        <Text
          style={{
            color: "white",
            fontWeight: "900",
            fontSize: 36,
            lineHeight: 42,
            marginBottom: 12,
            letterSpacing: -0.5,
          }}
          numberOfLines={2}
        >
          {item.name}
        </Text>

        {/* PREMIUM PRICE TAG */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <LinearGradient
            colors={["#10B981", "#059669"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 20,
              shadowColor: "#10B981",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <Text
              style={{
                color: "white",
                fontWeight: "900",
                fontSize: 28,
                letterSpacing: -0.5,
              }}
            >
              ₹{Number(item.price).toLocaleString("en-IN")}
            </Text>
          </LinearGradient>
        </View>

        {/* ELEGANT DESCRIPTION */}
        {item.description && (
          <Pressable onPress={() => setExpanded(!expanded)}>
            <BlurView
              intensity={20}
              tint="dark"
              style={{
                borderRadius: 16,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.1)",
              }}
            >
              <View style={{ padding: 16 }}>
                <Text
                  numberOfLines={expanded ? 8 : 2}
                  style={{
                    color: "#E5E7EB",
                    fontSize: 15,
                    lineHeight: 22,
                    fontWeight: "500",
                  }}
                >
                  {item.description}
                </Text>
                {(item.description?.length || 0) > 100 && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 8,
                      gap: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: "#9CA3AF",
                        fontSize: 13,
                        fontWeight: "700",
                      }}
                    >
                      {expanded ? "Show less" : "Read more"}
                    </Text>
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={14}
                      color="#9CA3AF"
                    />
                  </View>
                )}
              </View>
            </BlurView>
          </Pressable>
        )}
      </View>
    </View>
  );
};
