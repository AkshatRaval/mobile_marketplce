import { useAuth } from "@/src/context/AuthContext";
import {
  TabRefreshProvider,
  useTabRefresh,
} from "@/src/context/TabelRefreshContext";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, usePathname } from "expo-router";
import React, { useRef } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ICON_SIZE = 26;
const DOUBLE_TAP_DELAY = 300; // milliseconds

function TabsContent() {
  const { user, userDoc, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const { triggerRefresh } = useTabRefresh();
  const pathname = usePathname();



  // Track last tap time for each tab
  const lastTapRef = useRef<{ [key: string]: number }>({});

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  if (userDoc?.role !== "dealer") return <Redirect href="/" />;
  if (userDoc?.onboarding_status === "suspended")
    return <Redirect href="/suspended" />;
  if (userDoc?.onboarding_status !== "approved")
    return <Redirect href="/onboarding" />;

  // Custom Tab Button with Double-Tap Detection
  const CustomTabBarButton = ({
    children,
    onPress,
    routeName,
    ...props
  }: any) => {
    const handlePress = () => {
      // Check if current path corresponds to this tab
      // e.g. pathname="/dealer/home" and routeName="home" -> Match
      const normalizedRoute = routeName.replace('/index', '');
      const isActive = pathname === `/${normalizedRoute}` || pathname === `/(dealer)/${normalizedRoute}`;

      if (isActive) {
        // Already active -> Refresh
        triggerRefresh(routeName);
      } else {
        // Not active -> Navigate
        onPress?.();
      }
    };

    return (
      <TouchableOpacity {...props} onPress={handlePress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#000",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          backgroundColor: "#fff",
          borderTopWidth: 0.5,
          borderTopColor: "#E5E5EA",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={ICON_SIZE}
              color={color}
            />
          ),
          tabBarButton: (props) => (
            <CustomTabBarButton {...props} routeName="home" />
          ),
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "search" : "search-outline"}
              size={ICON_SIZE}
              color={color}
            />
          ),
          tabBarButton: (props) => (
            <CustomTabBarButton {...props} routeName="search" />
          ),
        }}
      />

      <Tabs.Screen
        name="upload-post"
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="add-circle-outline" size={30} color={color} />
          ),
          tabBarButton: (props) => (
            <CustomTabBarButton {...props} routeName="upload-post" />
          ),
        }}
      />

      <Tabs.Screen
        name="requests"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "heart" : "heart-outline"}
              size={ICON_SIZE}
              color={color}
            />
          ),
          tabBarButton: (props) => (
            <CustomTabBarButton {...props} routeName="requests" />
          ),
        }}
      />

      <Tabs.Screen
        name="profile/index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={ICON_SIZE}
              color={color}
            />
          ),
          tabBarButton: (props) => (
            <CustomTabBarButton {...props} routeName="profile/index" />
          ),
        }}
      />

      {/* Hidden Screens */}
      <Tabs.Screen name="services/sales-logs" options={{ href: null }} />
      <Tabs.Screen name="profile/[id]" options={{ href: null }} />
      <Tabs.Screen name="services/connections" options={{ href: null }} />
      <Tabs.Screen name="services/product-feed" options={{ href: null }} />
    </Tabs>
  );
}

export default function DealerLayout() {
  return (
    <TabRefreshProvider>
      <TabsContent />
    </TabRefreshProvider>
  );
}
