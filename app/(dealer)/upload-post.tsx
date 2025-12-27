import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// ✅ Import hooks - all logic is here now!
import { useImagePicker } from "@/src/hooks/useImagePicker";
import { useProductForm } from "@/src/hooks/useProductForm";

export default function UploadPost() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ✅ All image logic in this hook
  const { images, addImage, removeImage, canAddMore } = useImagePicker(4);

  // ✅ All form logic in this hook
  const {
    name,
    setName,
    price,
    setPrice,
    description,
    setDescription,
    uploading,
    submitProduct,
  } = useProductForm();

  // ✅ Simple handler - just calls the hook
  const handlePost = async () => {
    const success = await submitProduct(images);
    if (success) {
      router.back();
    }
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: "#fff" }}
    >
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View className="px-6 py-4 border-b border-gray-100">
        <Text className="text-2xl font-black">Add New Item</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 24,
            paddingBottom: 120 + insets.bottom,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* IMAGES */}
          <Text className="font-bold mb-3">Product Images</Text>
          <View className="flex-row flex-wrap gap-3 mb-6">
            {images.map((uri, i) => (
              <View
                key={i}
                className="relative w-20 h-20 rounded-xl overflow-hidden"
              >
                <Image source={{ uri }} className="w-full h-full" />
                <TouchableOpacity
                  onPress={() => removeImage(i)}
                  className="absolute top-1 right-1 bg-black/60 p-1 rounded-full"
                >
                  <Ionicons name="close" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}

            {canAddMore && (
              <TouchableOpacity
                onPress={addImage}
                className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl items-center justify-center"
              >
                <Ionicons name="camera-outline" size={22} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* NAME */}
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Product name"
            className="bg-gray-50 border p-4 rounded-xl mb-4"
          />

          {/* PRICE */}
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="Price"
            keyboardType="numeric"
            className="bg-gray-50 border p-4 rounded-xl mb-4"
          />

          {/* DESCRIPTION */}
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Details"
            multiline
            className="bg-gray-50 border p-4 rounded-xl h-32"
          />
        </ScrollView>

        {/* FOOTER */}
        <View
          style={{
            padding: 16,
            paddingBottom: 16 + insets.bottom,
            borderTopWidth: 1,
            borderColor: "#eee",
            backgroundColor: "#fff",
          }}
        >
          <TouchableOpacity
            onPress={handlePost}
            disabled={uploading}
            className="bg-indigo-600 py-4 rounded-xl items-center"
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-lg">
                Post Listing
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
