import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";
// 1. Import the hook
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ICON_SIZE = 26;

export default function DealerLayout() {
  const { user, userDoc, loading } = useAuth();
  // 2. Get the safe area insets
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  if (userDoc?.role !== "dealer") return <Redirect href="/" />;
  if (userDoc?.onboardingStatus === "suspended")
    return <Redirect href="/(auth)/suspended" />;
  if (userDoc?.onboardingStatus !== "approved")
    return <Redirect href="/(auth)/onboarding" />;

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
        }}
      />

      <Tabs.Screen
        name="upload-post"
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="add-circle-outline" size={30} color={color} />
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
        }}
      />

      <Tabs.Screen name="profile/[id]" options={{ href: null }} />
      <Tabs.Screen name="services/connections" options={{ href: null }} />
    </Tabs>
  );
}