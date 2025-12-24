import { auth } from "@/FirebaseConfig";
import { Link, useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
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
  
  // State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    // 1. Basic Validation
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      // 2. Perform Login
      await signInWithEmailAndPassword(auth, email, password);
      
      // 3. Navigate on Success
      router.replace("/"); // or usually '/(tabs)/home' depending on your layout

    } catch (error) {
      // 4. Handle Errors gracefully
      // @ts-ignore
      let msg = error.message;
      if (msg.includes("user-not-found") || msg.includes("wrong-password") || msg.includes("invalid-credential")) {
        msg = "Invalid email or password. Please try again.";
      } else if (msg.includes("too-many-requests")) {
        msg = "Too many failed attempts. Please try again later.";
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
          {/* Header Section */}
          <View className="mb-10">
            <Text className="text-4xl font-bold text-gray-900 mb-2">
              Welcome Back
            </Text>
            <Text className="text-gray-500 text-lg">
              Sign in to continue to your shop.
            </Text>
          </View>

          {/* Form Section */}
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

          {/* Action Button */}
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

          {/* Footer / Signup Link */}
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