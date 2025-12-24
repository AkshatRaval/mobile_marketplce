import { auth, db } from "@/FirebaseConfig";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
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


export default function Signup() {
  const router = useRouter();

  // Form State
  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // UI State
  const [loading, setLoading] = useState(false); // Fixed: Should start as false

  const signup = async () => {
    // 1. Basic Validation
    if (!name || !shopName || !email || !phone || !password) {
      Alert.alert("Missing Fields", "Please fill in all the details.");
      return;
    }

    setLoading(true);

    try {
      // 2. Create Authentication User
      const res = await createUserWithEmailAndPassword(auth, email, password);

      // 3. Create User Profile
      await setDoc(doc(db, "users", res.user.uid), {
        userEmail: email,
        displayName: name,
        shopName: shopName,
        phone: phone, // Good to have phone here too
        role: "dealer",
        onboardingStatus: "submitted",
        createdAt: Date.now(),
      });

      // 4. Create Pending Request
      await setDoc(doc(db, "pending-request", res.user.uid), {
        uid: res.user.uid,
        displayName: name,
        shopName: shopName, // Admin usually needs to know the shop name
        phone: phone,
        status: "pending",
        requestDate: Date.now()
      });

      // 5. Navigate
      router.replace("/onboarding");

    } catch (error: any) {
      // 6. meaningful Error Handling

      let msg = error.message;
      if (msg.includes("email-already-in-use")) msg = "This email is already registered.";
      if (msg.includes("weak-password")) msg = "Password should be at least 6 characters.";
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
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          showsVerticalScrollIndicator={false}
          className="px-6 py-4"
        >
          
          {/* Header Section */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-gray-900 mb-2">
              Create Account
            </Text>
            <Text className="text-gray-500 text-base">
              Join us to start managing your dealership.
            </Text>
          </View>

          {/* Form Section */}
          <View className="space-y-4">
            
            <View>
              <Text className="text-gray-700 font-medium mb-1 ml-1">Full Name</Text>
              <TextInput
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-700 focus:border-indigo-500"
                placeholder="Ex. John Doe"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-1 ml-1">Shop Name</Text>
              <TextInput
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-700 focus:border-indigo-500"
                placeholder="Ex. City Motors"
                placeholderTextColor="#9CA3AF"
                value={shopName}
                onChangeText={setShopName}
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-1 ml-1">Phone Number</Text>
              <TextInput
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-700 focus:border-indigo-500"
                placeholder="Ex. 9876543210"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-1 ml-1">Email Address</Text>
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
              <Text className="text-gray-700 font-medium mb-1 ml-1">Password</Text>
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

          {/* Action Button */}
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

          {/* Footer / Login Link */}
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