import { db } from "@/FirebaseConfig";
import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  updateDoc,
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

/* ===============================
   CONFIG
================================ */
const debuggerHost =
  Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
const localhost = debuggerHost?.split(":")[0] || "localhost";

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_NAME;
const UPLOAD_PRESET = "phone_images";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const EXTRACTION_API_URL = `http://${localhost}:8000/extract`;

export default function Inventory() {
  const { user, userDoc } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [images, setImages] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  /* ===============================
     HELPERS
  ================================ */
  const getWordCount = (text: string) =>
    text.trim().split(/\s+/).filter(Boolean).length;

  const pickImage = async () => {
    if (images.length >= 4) {
      Alert.alert("Limit Reached", "Max 4 images allowed.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
    });

    if (!result.canceled) {
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadToCloudinary = async (uri: string) => {
    const formData = new FormData();
    const filename = uri.split("/").pop() || "image.jpg";

    // @ts-ignore
    formData.append("file", {
      uri,
      name: filename,
      type: "image/jpeg",
    });
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!data.secure_url) throw new Error("Upload failed");
    return data.secure_url;
  };

  const handlePost = async () => {
    if (!user?.uid) return;

    if (!name || !price || !description || images.length === 0) {
      Alert.alert("Missing info", "Fill all fields.");
      return;
    }

    setUploading(true);
    try {
      const imageUrls = await Promise.all(
        images.map(uploadToCloudinary)
      );

      const docRef = await addDoc(collection(db, "products"), {
        userId: user.uid,
        dealerName: userDoc?.displayName,
        city: userDoc?.city,
        name,
        price,
        description,
        images: imageUrls,
        createdAt: Date.now(),
      });

      await updateDoc(doc(db, "users", user.uid), {
        listings: arrayUnion({
          id: docRef.id,
          name,
          price,
          image: imageUrls[0],
        }),
      });

      Alert.alert("Success", "Listing added");
      router.back();
    } catch (e) {
      Alert.alert("Error", "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  /* ===============================
     UI
  ================================ */
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
              <View key={i} className="relative w-20 h-20 rounded-xl overflow-hidden">
                <Image source={{ uri }} className="w-full h-full" />
                <TouchableOpacity
                  onPress={() => removeImage(i)}
                  className="absolute top-1 right-1 bg-black/60 p-1 rounded-full"
                >
                  <Ionicons name="close" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}

            {images.length < 4 && (
              <TouchableOpacity
                onPress={pickImage}
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

        {/* FIXED FOOTER */}
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
