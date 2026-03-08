// app/(auth)/signup.tsx
import { useSignup } from "@/src/hooks/useSignup";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
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

// ─── Moved OUTSIDE component to prevent remount on every keystroke ───────────

const SectionLabel = ({ title }: { title: string }) => (
  <Text className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-2 mt-4">
    {title}
  </Text>
);

type FieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: any;
  maxLength?: number;
  autoCapitalize?: any;
  icon: string;
  secure?: boolean;
  showToggle?: boolean;
  shown?: boolean;
  onToggle?: () => void;
};

const Field = ({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  maxLength,
  autoCapitalize = "words",
  icon,
  secure = false,
  showToggle = false,
  shown = false,
  onToggle,
}: FieldProps) => (
  <View className="mb-2.5">
    <Text className="text-gray-500 font-medium text-xs mb-1 ml-0.5">{label}</Text>
    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 h-11">
      <Ionicons name={icon as any} size={15} color="#9CA3AF" />
      <TextInput
        className="flex-1 ml-2 text-gray-800 text-sm"
        placeholder={placeholder}
        placeholderTextColor="#C4C4C4"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        maxLength={maxLength}
        secureTextEntry={secure && !shown}
        autoCapitalize={autoCapitalize}
      />
      {showToggle && (
        <TouchableOpacity onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons
            name={shown ? "eye-outline" : "eye-off-outline"}
            size={15}
            color="#9CA3AF"
          />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────

export default function Signup() {
  const router = useRouter();
  const {
    ownerName, setOwnerName,
    shopName, setShopName,
    city, setCity,
    phone, setPhone,
    email, setEmail,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    showPassword, setShowPassword,
    showConfirmPassword, setShowConfirmPassword,
    loading,
    signup,
  } = useSignup();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 28 }}
        >
          {/* Header */}
          <View className="mb-5">
            <Text className="text-2xl font-black text-gray-900">Create Account</Text>
            <Text className="text-gray-400 text-xs mt-0.5">
              Register your dealership to get started.
            </Text>
          </View>

          <SectionLabel title="Business Info" />
          <Field
            label="Owner Name"
            placeholder="Ex. Rahul Sharma"
            value={ownerName}
            onChangeText={setOwnerName}
            icon="person-outline"
          />
          <Field
            label="Shop Name"
            placeholder="Ex. City Mobiles"
            value={shopName}
            onChangeText={setShopName}
            icon="storefront-outline"
          />
          <Field
            label="City"
            placeholder="Ex. Ahmedabad"
            value={city}
            onChangeText={setCity}
            icon="location-outline"
          />

          <SectionLabel title="Contact Info" />
          <Field
            label="Phone Number"
            placeholder="10-digit number"
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/\D/g, ""))}
            keyboardType="number-pad"
            maxLength={10}
            icon="call-outline"
            autoCapitalize="none"
          />
          <Field
            label="Email (@gmail.com only)"
            placeholder="yourname@gmail.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            icon="mail-outline"
            autoCapitalize="none"
          />

          <SectionLabel title="Security" />
          <Field
            label="Password"
            placeholder="Min. 6 characters"
            value={password}
            onChangeText={setPassword}
            icon="lock-closed-outline"
            autoCapitalize="none"
            secure
            showToggle
            shown={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
          />
          <Field
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            icon="lock-closed-outline"
            autoCapitalize="none"
            secure
            showToggle
            shown={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((v) => !v)}
          />

          {/* Sign Up Button */}
          <TouchableOpacity
            onPress={signup}
            disabled={loading}
            className={`w-full h-12 rounded-2xl items-center justify-center mt-5 ${loading ? "bg-indigo-400" : "bg-indigo-600"
              }`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-black text-sm">Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View className="flex-row justify-center mt-4">
            <Text className="text-gray-400 text-sm">Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text className="text-indigo-600 font-bold text-sm">Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}