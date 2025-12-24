import { useAuth } from "@/src/context/AuthContext";
import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function AdminLayout() {
  const { user, userDoc, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  // 1. If not logged in -> Login
  if (!user) return <Redirect href="/login" />;

  // 2. If logged in but NOT admin -> Home
  // Make sure your specific admin user document in Firestore has role: "admin"
  if (userDoc?.role !== "admin") {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
    </Stack>
  );
}