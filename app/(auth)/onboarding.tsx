// app/onboarding.tsx
import { useOnboarding } from "@/src/hooks/useOnboarding";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Onboarding() {
  const router = useRouter();
  const {
    user,
    userDoc,
    isSubmitted,
    submitting,
    submitForApproval,
    refreshProfile,
    handleWhatsApp,
    handleCall,
    handleEmail,
  } = useOnboarding();

  // Protected Route Logic
  if (!user) return <Redirect href="/login" />;

  // If approved, kick them to the main app
  if (userDoc?.onboarding_status === "approved") {
    return <Redirect href="/" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <View className="flex-1 px-6 justify-center items-center">
        <View className="items-center mb-10">
          <View
            className={`w-24 h-24 rounded-full items-center justify-center mb-6 ${isSubmitted ? "bg-indigo-50" : "bg-yellow-50"}`}
          >
            <Ionicons
              name={isSubmitted ? "hourglass-outline" : "alert-circle-outline"}
              size={48}
              color={isSubmitted ? "#4F46E5" : "#D97706"}
            />
          </View>

          <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
            {isSubmitted ? "Verification in Progress" : "Action Required"}
          </Text>

          <Text className="text-gray-500 text-center text-base px-4 leading-6">
            {isSubmitted
              ? "Thanks for signing up! We are currently reviewing your dealership details. This usually takes 2-4 hours."
              : "Please submit your profile for admin verification to start using the app."}
          </Text>
        </View>

        {!isSubmitted && (
          <TouchableOpacity
            onPress={submitForApproval}
            disabled={submitting}
            className="w-full bg-indigo-600 py-4 rounded-xl shadow-md mb-10"
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-center font-bold text-lg">
                Submit for Approval
              </Text>
            )}
          </TouchableOpacity>
        )}

        <View className="w-full bg-gray-50 rounded-2xl p-6 border border-gray-100">
          <Text className="text-gray-800 font-bold mb-4 text-center">
            Need help or urgent approval?
          </Text>

          <View className="flex-row justify-between items-center px-2">
            <TouchableOpacity onPress={handleCall} className="items-center">
              <View className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm border border-gray-100 mb-2">
                <Ionicons name="call" size={20} color="#374151" />
              </View>
              <Text className="text-xs text-gray-500 font-medium">Call</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleEmail} className="items-center">
              <View className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm border border-gray-100 mb-2">
                <Ionicons name="mail" size={20} color="#374151" />
              </View>
              <Text className="text-xs text-gray-500 font-medium">Email</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleWhatsApp} className="items-center">
              <View className="w-12 h-12 bg-green-500 rounded-full items-center justify-center shadow-md mb-2">
                <Ionicons name="logo-whatsapp" size={24} color="#fff" />
              </View>
              <Text className="text-xs text-green-600 font-bold">Chat</Text>
            </TouchableOpacity>
          </View>

          <View className="mt-4 pt-4 border-t border-gray-200">
            <Text className="text-center text-gray-400 text-xs">
              Support ID: {user.id.slice(0, 8)}
            </Text>
          </View>
        </View>

        {/* Added Manual Refresh Button for UX */}
        {isSubmitted && (
          <TouchableOpacity onPress={refreshProfile} className="mt-8">
            <Text className="text-indigo-600 font-bold">Check Status Again</Text>
          </TouchableOpacity>
        )}

        <View className="mt-4 pt-4">
          <Text
            className="text-center text-gray-400 text-xs underline"
            onPress={() => router.replace("/login")}
          >
            Back To Login
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}