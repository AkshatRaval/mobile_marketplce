// src/hooks/useImagePicker.ts
// Handles ALL image picking logic — gallery + camera

import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Platform } from "react-native";

interface UseImagePickerReturn {
  images: string[];
  addImage: () => Promise<void>;
  addImageFromCamera: () => Promise<void>;
  removeImage: (index: number) => void;
  clearImages: () => void;
  canAddMore: boolean;
}

export function useImagePicker(maxImages: number = 4): UseImagePickerReturn {
  const [images, setImages] = useState<string[]>([]);

  /** Pick image from gallery */
  const addImage = async () => {
    if (images.length >= maxImages) {
      Alert.alert("Limit Reached", `Max ${maxImages} images allowed.`);
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photos to upload images."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: false,
        quality: 0.7,
        exif: false,
        base64: false,
        ...(Platform.OS === "android" && { selectionLimit: 1 }),
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImages((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error("❌ Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  /** Capture a photo directly from camera */
  const addImageFromCamera = async () => {
    if (images.length >= maxImages) {
      Alert.alert("Limit Reached", `Max ${maxImages} images allowed.`);
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow camera access to take photos."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        exif: false,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImages((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error("❌ Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const clearImages = () => {
    setImages([]);
  };

  const canAddMore = images.length < maxImages;

  return {
    images,
    addImage,
    addImageFromCamera,
    removeImage,
    clearImages,
    canAddMore,
  };
}