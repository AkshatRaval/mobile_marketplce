import { useAuth } from "@/src/context/AuthContext";
import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { user, userDoc, loading } = useAuth();

  // 1. LOADING STATE
  // Show a clean loading screen while Firebase checks the session.
  // Do NOT render DealerHome here, or it will crash due to missing data.
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        {/* Optional: Add your Logo here */}
        {/* <Image source={require('@/assets/logo.png')} className="w-24 h-24 mb-4" /> */}
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  // 2. UNAUTHENTICATED
  // If no user is found after loading, send to Login.
  if (!user) {
    return <Redirect href="/login" />;
  }

  // 3. ADMIN ROUTE
  if (userDoc?.role === "admin") {
    return <Redirect href="/dashboard" />;
  }

  // 4. DEALER ROUTE
  if (userDoc?.role === "dealer") {
    // CRITICAL: Check if they are actually approved to enter
    if (userDoc?.onboarding_status === "approved") {
      return <Redirect href="/(dealer)/home" />;
    } else if(userDoc?.onboarding_status === "suspended"){
      // If pending, rejected, or submitted, send back to onboarding status screen
      return <Redirect href="/(auth)/suspended" />;
    }else {
      return <Redirect href="/(auth)/onboarding" />;
    }
  }

  // 5. FALLBACK
  // If role is unknown or missing, kick back to login to be safe
  return <Redirect href="/login" />;
}