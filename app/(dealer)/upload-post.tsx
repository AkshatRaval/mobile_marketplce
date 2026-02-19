import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
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

import { useImagePicker } from "@/src/hooks/useImagePicker";
import { useProductForm } from "@/src/hooks/useProductForm";

export default function UploadPost() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { images, addImage, removeImage, clearImages, canAddMore } =
    useImagePicker(4);

  const {
    name,
    setName,
    price,
    setPrice,
    description,
    setDescription,
    uploading,
    submitProduct,
    reset,
  } = useProductForm();

  useEffect(() => {
    return () => {
      reset?.();
      clearImages?.();
    };
  }, []);

  const handlePost = async () => {
    const success = await submitProduct(images);
    if (success) {
      setName("");
      setPrice("");
      setDescription("");

      if (clearImages) {
        clearImages();
      }

      if (reset) {
        reset();
      }

      router.replace("/");
    }
  };

  const isValid = name.trim() && price.trim() && images.length > 0;

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: "#FAFAFA" }}
    >
      <StatusBar barStyle="dark-content" />

      {/* CLEAN HEADER */}
      <View className="px-6 py-5 bg-white border-b border-gray-100">
        <Text className="text-2xl font-black text-gray-900">Create Listing</Text>
        <Text className="text-sm text-gray-500 mt-1">Fill in the details below</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 120 + insets.bottom,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* PHOTOS SECTION */}
          <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-bold text-gray-900">Product Photos</Text>
              <View className="bg-gray-100 px-3 py-1 rounded-full">
                <Text className="text-xs font-semibold text-gray-600">
                  {images.length} / 4
                </Text>
              </View>
            </View>

            <View className="flex-row flex-wrap gap-3">
              {images.map((uri, i) => (
                <View
                  key={i}
                  className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-50"
                >
                  <Image source={{ uri }} className="w-full h-full" />
                  <TouchableOpacity
                    onPress={() => removeImage(i)}
                    className="absolute -top-1 -right-1 bg-red-500 w-6 h-6 rounded-full items-center justify-center shadow-md"
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}

              {canAddMore && (
                <TouchableOpacity
                  onPress={addImage}
                  className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl items-center justify-center bg-gray-50"
                >
                  <Ionicons name="add-circle-outline" size={24} color="#9CA3AF" />
                  <Text className="text-[10px] text-gray-500 font-medium mt-1">Add</Text>
                </TouchableOpacity>
              )}
            </View>

            {images.length === 0 && (
              <View className="items-center py-8 border-t border-gray-100 mt-3">
                <Ionicons name="camera-outline" size={40} color="#D1D5DB" />
                <Text className="text-sm text-gray-400 font-medium mt-2">
                  Add product images
                </Text>
              </View>
            )}
          </View>

          {/* PRODUCT DETAILS */}
          <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
            <Text className="text-base font-bold text-gray-900 mb-4">Product Details</Text>

            {/* NAME */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Product Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter product name"
                placeholderTextColor="#9CA3AF"
                className="bg-gray-50 text-gray-900 border border-gray-200 px-4 py-3.5 rounded-xl font-medium text-base"
              />
            </View>

            {/* PRICE */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Price
              </Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                <View className="px-4 py-3.5 bg-gray-100 border-r border-gray-200">
                  <Text className="text-gray-600 font-bold text-base">₹</Text>
                </View>
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  className="flex-1 text-gray-900 px-4 py-3.5 font-semibold text-base"
                />
              </View>
            </View>

            {/* DESCRIPTION */}
            <View>
              <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Description
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the product condition, features, etc."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="bg-gray-50 text-gray-900 border border-gray-200 px-4 py-3.5 rounded-xl font-medium text-base h-28"
              />
            </View>
          </View>

          {/* INFO TIP */}
          <View className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <View className="flex-row items-start">
              <View className="bg-blue-100 w-9 h-9 rounded-full items-center justify-center mr-3">
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-blue-900 mb-0.5">
                  Quick Tip
                </Text>
                <Text className="text-xs text-blue-700 leading-5">
                  High-quality photos and detailed descriptions help sell faster
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* BOTTOM ACTION BAR */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingBottom: insets.bottom + 16,
            paddingHorizontal: 20,
            paddingTop: 16,
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "#F3F4F6",
          }}
        >
          <TouchableOpacity
            onPress={handlePost}
            disabled={uploading || !isValid}
            className={`${
              uploading || !isValid
                ? "bg-gray-300"
                : "bg-indigo-600"
            } py-4 rounded-xl items-center shadow-sm`}
          >
            {uploading ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="#fff" size="small" />
                <Text className="text-white font-bold text-base ml-2">
                  Publishing...
                </Text>
              </View>
            ) : (
              <Text className="text-white font-bold text-base">
                Publish Listing
              </Text>
            )}
          </TouchableOpacity>

          {!isValid && !uploading && (
            <Text className="text-center text-gray-400 text-xs font-medium mt-2">
              {images.length === 0
                ? "Please add at least one photo"
                : !name.trim()
                ? "Product name is required"
                : "Price is required"}
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}