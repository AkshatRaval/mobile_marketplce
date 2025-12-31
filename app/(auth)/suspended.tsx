// app/suspended.tsx
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/supabaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import {
  Linking,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SUPPORT_PHONE = "+919876543210";
const SUPPORT_EMAIL = "support@yourcompany.com";

export default function Suspended() {
  const { user, userDoc } = useAuth();
  const router = useRouter();

  if (!user) return <Redirect href="/login" />;
  
  // Supabase returns snake_case columns in userDoc
  if (userDoc?.onboarding_status !== "suspended") {
    return <Redirect href="/" />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleWhatsApp = () => {
    const msg = `Hello, my account has been suspended. Support ID: ${user.id.slice(0, 8)}`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}&phone=${SUPPORT_PHONE}`);
  };

  const handleCall = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`);
  };

  const handleEmail = () => {
    const subject = "Account Suspended - Support Request";
    const body = `Support ID: ${user.id.slice(0, 8)}\n\nMy account has been suspended. Please help.`;
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <View className="flex-1 px-6 justify-center items-center">
        
        <View className="items-center mb-10">
          <View className="w-24 h-24 rounded-full bg-red-50 items-center justify-center mb-6">
            <Ionicons name="ban-outline" size={48} color="#DC2626" />
          </View>

          <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
            Account Suspended
          </Text>

          <Text className="text-gray-500 text-center text-base px-4 leading-6">
            Your account has been temporarily suspended. Please contact support to resolve this issue and restore access.
          </Text>
        </View>

        <View className="w-full bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-6">
          <Text className="text-gray-800 font-bold mb-4 text-center">
            Contact Support
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

        <TouchableOpacity
          onPress={handleLogout}
          className="w-full bg-gray-200 py-4 rounded-xl"
        >
          <Text className="text-gray-800 text-center font-bold text-base">
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}