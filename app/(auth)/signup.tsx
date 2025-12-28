// app/signup.tsx
import { authApi } from "@/src/services/api/authApi";
import { signupValidation } from "@/src/services/business/validationService";
import { useRouter } from "expo-router";
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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Signup() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signup = async () => {
    const requiredCheck = signupValidation.validateRequired({
      name,
      shopName,
      email,
      phone,
      password,
    });
    if (!requiredCheck.valid) {
      Alert.alert("Missing Fields", requiredCheck.error);
      return;
    }

    const emailCheck = signupValidation.validateEmail(email);
    if (!emailCheck.valid) {
      Alert.alert("Invalid Email", emailCheck.error);
      return;
    }

    const phoneCheck = signupValidation.validatePhone(phone);
    if (!phoneCheck.valid) {
      Alert.alert("Invalid Phone", phoneCheck.error);
      return;
    }

    setLoading(true);

    try {
      await authApi.signUp(emailCheck.valid ? email.trim().toLowerCase() : email, password, {
        displayName: name.trim(),
        shopName: shopName.trim(),
        phone: phoneCheck.cleaned!,
      });

      router.replace("/onboarding");
    } catch (error: any) {
      let msg = error.message;
      if (msg.includes("email-already-in-use"))
        msg = "This email is already registered.";
      if (msg.includes("weak-password"))
        msg = "Password should be at least 6 characters.";
      Alert.alert("Registration Failed", msg);
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
          className="px-6 py-4"
        >
          <View className="mb-8">
            <Text className="text-3xl font-bold text-gray-900 mb-2">
              Create Account
            </Text>
            <Text className="text-gray-500 text-base">
              Join us to start managing your dealership.
            </Text>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-gray-700 font-medium mb-1 ml-1">
                Full Name
              </Text>
              <TextInput
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-700 focus:border-indigo-500"
                placeholder="Ex. John Doe"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-1 ml-1">
                Shop Name
              </Text>
              <TextInput
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-700 focus:border-indigo-500"
                placeholder="Ex. City Motors"
                placeholderTextColor="#9CA3AF"
                value={shopName}
                onChangeText={setShopName}
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-1 ml-1">
                Phone Number
              </Text>
              <TextInput
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-700 focus:border-indigo-500"
                placeholder="Ex. 9876543210"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-1 ml-1">
                Email Address
              </Text>
              <TextInput
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-700 focus:border-indigo-500"
                placeholder="john@gmail.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-1 ml-1">
                Password
              </Text>
              <TextInput
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-700 focus:border-indigo-500"
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          <View className="mt-8 mb-4">
            <TouchableOpacity
              onPress={signup}
              disabled={loading}
              className={`w-full py-4 rounded-xl shadow-sm ${
                loading ? "bg-indigo-400" : "bg-indigo-600"
              }`}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-center font-bold text-lg">
                  Sign Up
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-2">
            <Text className="text-gray-500">Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text className="text-indigo-600 font-bold">Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}