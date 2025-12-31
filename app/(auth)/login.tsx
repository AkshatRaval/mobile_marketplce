// app/login.tsx
import { authApi } from "@/src/services/api/authApi";
import { supabase } from "@/src/supabaseConfig";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Login() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      console.log("Attempting login for:", email);

      // 1. Perform Login
      const user = await authApi.login(email, password);

      if (!user) throw new Error("Login failed - No user returned");
      console.log("Login successful. User ID:", user.id);

      // 2. Check User Status in 'profiles' table
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("onboarding_status")
        .eq("id", user.id)
        .maybeSingle(); // Prevents crash if row doesn't exist

      if (error) {
        console.error("Profile fetch error:", error.message);
        // Fallback: If we can't check status, assume standard user or handle error
        router.replace("/"); 
        return;
      }

      if (!profile) {
        console.log("No profile found for this user. Routing to Home.");
        router.replace("/");
        return;
      }

      // 3. Route based on Status
      const status = profile.onboarding_status;
      console.log("User Status found:", status);

      if (status === "submitted" || status === "pending") {
        console.log("Redirecting to Onboarding...");
        router.replace("/onboarding");
      } else if (status === "suspended") {
        console.log("Redirecting to Suspended...");
        router.replace("/suspended");
      } else {
        console.log("Redirecting to Home...");
        router.replace("/");
      }

    } catch (error: any) {
      console.error("Login flow error:", error);
      let msg = error.message;
      
      if (msg.includes("Invalid login credentials")) {
        msg = "Invalid email or password. Please try again.";
      } else if (msg.includes("Email not confirmed")) {
        msg = "Please verify your email address before logging in.";
      }

      Alert.alert("Login Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          showsVerticalScrollIndicator={false}
          className="px-6"
        >
          <View className="mb-10">
            <Text className="text-4xl font-bold text-gray-900 mb-2">
              Welcome Back
            </Text>
            <Text className="text-gray-500 text-lg">
              Sign in to continue to your shop.
            </Text>
          </View>

          <View className="space-y-6">
            <View>
              <Text className="text-gray-700 font-medium mb-2 ml-1">Email Address</Text>
              <TextInput
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-700 focus:border-indigo-500"
                placeholder="john@example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2 ml-1">Password</Text>
              <TextInput
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-700 focus:border-indigo-500"
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity className="self-end mt-2">
                <Text className="text-indigo-600 font-medium text-sm">Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="mt-8 mb-6">
            <TouchableOpacity
              onPress={login}
              disabled={loading}
              className={`w-full py-4 rounded-xl shadow-sm ${
                loading ? "bg-indigo-400" : "bg-indigo-600"
              }`}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-center font-bold text-lg">
                  Log In
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-4">
            <Text className="text-gray-500 text-base">Don't have an account? </Text>
            <Link href="/signup" asChild>
              <TouchableOpacity>
                <Text className="text-indigo-600 font-bold text-base">Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}