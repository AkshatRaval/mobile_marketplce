import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function DealerLayout() {
  const { user, userDoc, loading } = useAuth();

  // 1. Loading State (Better than null)
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  // 2. Auth & Role Guards
  if (!user) return <Redirect href="/login" />;

  if (userDoc?.role !== "dealer") {
    // If a regular user tries to access dealer area, send them back to main home
    return <Redirect href="/" />;
  }

  if (userDoc?.onboardingStatus !== "approved") {
    return <Redirect href="/onboarding" />;
  }

  // 3. Tabs Configuration
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // We use custom headers in our screens
        tabBarActiveTintColor: "#4F46E5", // Indigo-600
        tabBarInactiveTintColor: "#9CA3AF", // Gray-400
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#F3F4F6",
          height: 65, // Taller for better touch area
          paddingBottom: 10,
          paddingTop: 10,
          elevation: 0, // Remove shadow on Android for cleaner look
          shadowOpacity: 0, // Remove shadow on iOS
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: -4, // Pull label closer to icon
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "search" : "search-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="upload-post"
        options={{
          title: "Add Phone",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "add-circle" : "add-circle-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "phone-portrait" : "phone-portrait-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/[id]"
        options={{
          href: null, // This effectively hides it from the bottom bar
        }}
      />
    </Tabs>
  );
}
