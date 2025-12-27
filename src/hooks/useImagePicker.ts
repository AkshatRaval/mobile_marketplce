// src/hooks/useImagePicker.ts
// Handles ALL image picking logic
// EXTRACTED FROM: upload.tsx lines 51, 71-92

import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert } from "react-native";

interface UseImagePickerReturn {
  images: string[];
  addImage: () => Promise<void>;
  removeImage: (index: number) => void;
  clearImages: () => void;
  canAddMore: boolean;
}

export function useImagePicker(maxImages: number = 4): UseImagePickerReturn {
  const [images, setImages] = useState<string[]>([]);

  /**
   * Pick image from library
   * EXTRACTED FROM: upload.tsx pickImage function (lines 71-87)
   */
  const addImage = async () => {
    // Check limit
    if (images.length >= maxImages) {
      Alert.alert("Limit Reached", `Max ${maxImages} images allowed.`);
      return;
    }

    try {
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.6,
      });

      // Add image if not cancelled
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImages((prev) => [...prev, result.assets[0].uri]);
        // console.log("✅ Image added:", result.assets[0].uri);
      }

    } catch (error) {
      console.error("❌ Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    // console.log("🗑️ Image removed at index:", index);
  };

  /**
   * Clear all images
   */
  const clearImages = () => {
    setImages([]);
    console.log("🗑️ All images cleared");
  };

  const canAddMore = images.length < maxImages;

  return {
    images,
    addImage,
    removeImage,
    clearImages,
    canAddMore,
  };
}