import { db } from "@/FirebaseConfig";
import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  updateDoc
} from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { SafeAreaView } from "react-native-safe-area-context";

// --- CLOUDINARY CONFIG ---
const CLOUD_NAME = "dx90g9xvc";
const UPLOAD_PRESET = "phone_images";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export default function Inventory() {
  const { user, userDoc } = useAuth();
  const router = useRouter();

  // --- STATE ---
  const [images, setImages] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  // --- HELPERS ---

  const getWordCount = (text: string) => {
    return text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
  };

  const handleNameChange = (text: string) => {
    if (getWordCount(text) <= 25) {
      setName(text);
    }
  };

  const pickImage = async () => {
    if (images.length >= 4) {
      Alert.alert("Limit Reached", "You can only upload up to 4 images.");
      return;
    }

    // --- UPDATED CONFIGURATION ---
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  // --- CLOUDINARY UPLOAD FUNCTION ---
  const uploadToCloudinary = async (uri: string) => {
    const formData = new FormData();

    const filename = uri.split("/").pop();
    const match = /\.(\w+)$/.exec(filename || "");
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    // @ts-ignore: React Native FormData expects this shape
    formData.append("file", { uri, name: filename, type });
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", "dealer_app_products");

    try {
      const response = await fetch(CLOUDINARY_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.secure_url) {
        return data.secure_url;
      } else {
        throw new Error("Cloudinary upload failed");
      }
    } catch (error) {
      console.error("Upload Error:", error);
      throw error;
    }
  };

  // --- MAIN POST LOGIC ---
  const handlePost = async () => {
    if (!user?.uid) {
      Alert.alert("Error", "You must be logged in.");
      return;
    }

    if (!name || !price || !description || images.length === 0) {
      Alert.alert(
        "Missing Details",
        "Please fill all fields and add at least 1 image."
      );
      return;
    }

    if (getWordCount(name) > 25) {
      Alert.alert("Title too long", "Please keep the name under 25 words.");
      return;
    }

    setUploading(true);

    try {
      // 1. Upload all images to Cloudinary concurrently
      const imageUrls = await Promise.all(
        images.map((uri) => uploadToCloudinary(uri))
      );

      // 2. Save metadata to Firestore (Products Collection)
      const newProductRef = await addDoc(collection(db, "products"), {
        userId: user.uid,
        dealerName: userDoc?.displayName || "Unknown Dealer",
        shopName: userDoc?.shopName || "Unknown Shop",
        city: userDoc?.city || "N/A",
        name: name,
        nameWordCount: getWordCount(name),
        price: price,
        description: description,
        images: imageUrls,
        createdAt: Date.now(),
        status: "active",
      });

      // 3. Update User's Profile with the new Listing ID
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        listings: arrayUnion({
          id: newProductRef.id,
          name: name,
          price: price,
          image: imageUrls[0], 
        }),
      });

      Alert.alert("Success", "Product listed successfully!");

      // Reset
      setName("");
      setPrice("");
      setDescription("");
      setImages([]);
      router.push("/");
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Error",
        "Could not upload listing. Please check your internet connection."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-100">
        <Text className="text-2xl font-black text-gray-900">Add New Item</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6 pt-6"
          showsVerticalScrollIndicator={false}
        >
          {/* Images */}
          <Text className="text-gray-700 font-bold mb-3">
            Product Images (Max 4)
          </Text>
          <View className="flex-row flex-wrap gap-3 mb-6">
            {images.map((uri, index) => (
              <View
                key={index}
                className="relative w-20 h-20 rounded-xl overflow-hidden shadow-sm"
              >
                <Image
                  source={{ uri }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
                >
                  <Ionicons name="close" size={12} color="white" />
                </TouchableOpacity>
              </View>
            ))}

            {images.length < 4 && (
              <TouchableOpacity
                onPress={pickImage}
                className="w-20 h-20 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl items-center justify-center"
              >
                <Ionicons name="camera-outline" size={24} color="#9CA3AF" />
                <Text className="text-[10px] text-gray-400 font-bold mt-1">
                  ADD
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Name */}
          <View className="mb-5">
            <View className="flex-row justify-between mb-2 ml-1">
              <Text className="text-gray-700 font-bold">Product Name</Text>
              <Text
                className={`text-xs font-bold ${getWordCount(name) >= 25 ? "text-red-500" : "text-gray-400"}`}
              >
                {getWordCount(name)}/25 words
              </Text>
            </View>
            <TextInput
              value={name}
              onChangeText={handleNameChange}
              placeholder="Ex. iPhone 15 Pro Max 256GB"
              className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-gray-900 font-medium"
            />
          </View>

          {/* Price */}
          <View className="mb-5">
            <Text className="text-gray-700 font-bold mb-2 ml-1">Price</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="₹ 0.00"
              keyboardType="numeric"
              className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-gray-900 font-medium"
            />
          </View>

          {/* Description */}
          <View className="mb-8">
            <Text className="text-gray-700 font-bold mb-2 ml-1">
              Details / Specs
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              placeholder="Ex. 8GB RAM, 256GB Storage, Battery Health 90%..."
              className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-gray-900 h-32 pt-4"
            />
          </View>

          <View className="h-20" />
        </ScrollView>

        {/* Submit */}
        <View className="p-6 bg-white border-t border-gray-100">
          <TouchableOpacity
            onPress={handlePost}
            disabled={uploading}
            className={`w-full py-4 rounded-xl shadow-lg flex-row justify-center items-center ${
              uploading ? "bg-indigo-400" : "bg-indigo-600"
            }`}
          >
            {uploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text className="text-white font-bold text-lg mr-2">
                  Post Listing
                </Text>
                <Ionicons name="arrow-up-circle" size={24} color="white" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}