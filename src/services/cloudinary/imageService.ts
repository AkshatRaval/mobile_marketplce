// src/services/cloudinary/cloudinaryService.ts
// ✨ CONSOLIDATED - ALL Cloudinary operations in ONE place
// Combines imageService (upload) + cloudinaryService (delete)

import type { CloudinaryUploadResponse } from "@/src/types";
import * as Crypto from "expo-crypto";

// Cloudinary configuration
const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_NAME;
const CLOUDINARY_API_KEY = process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.EXPO_PUBLIC_CLOUDINARY_API_SECRET;
const UPLOAD_PRESET = "phone_images";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export const cloudinaryService = {
  uploadImage: async (uri: string): Promise<string> => {
    try {
      const formData = new FormData();
      const filename = uri.split("/").pop() || "image.jpg";

      // @ts-ignore - React Native FormData format
      formData.append("file", {
        uri,
        name: filename,
        type: "image/jpeg",
      });
      formData.append("upload_preset", UPLOAD_PRESET);

      const response = await fetch(CLOUDINARY_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      const data: CloudinaryUploadResponse = await response.json();

      if (!data.secure_url) {
        throw new Error("No secure URL in Cloudinary response");
      }

      console.log("✅ Image uploaded to Cloudinary:", data.secure_url);
      return data.secure_url;
    } catch (error) {
      console.error("❌ Cloudinary upload error:", error);
      throw new Error("Failed to upload image to Cloudinary");
    }
  },

  uploadMultipleImages: async (uris: string[]): Promise<string[]> => {
    try {
      console.log(`📤 Uploading ${uris.length} images to Cloudinary...`);

      const uploadPromises = uris.map((uri) =>
        cloudinaryService.uploadImage(uri)
      );
      const urls = await Promise.all(uploadPromises);

      console.log(`✅ All ${urls.length} images uploaded successfully`);
      return urls;
    } catch (error) {
      console.error("❌ Error uploading multiple images:", error);
      throw error;
    }
  },

  deleteImage: async (imageUrl: string): Promise<void> => {
    if (!imageUrl) {
      console.log("⚠️ No image URL provided");
      return;
    }

    try {
      console.log(`🗑️ Deleting image from Cloudinary: ${imageUrl}`);

      // Extract path from URL
      const split = imageUrl.split("/upload/");
      if (split.length < 2) {
        console.log("⚠️ Invalid Cloudinary URL format");
        return;
      }

      // Remove version prefix and get filename
      let path = split[1].replace(/^v\d+\//, "");

      // Extract public_id (filename without extension)
      const publicId = path.split(".")[0];

      // Generate timestamp for signature
      const timestamp = Math.round(new Date().getTime() / 1000);

      // Generate SHA1 signature
      const signature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA1,
        `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`
      );

      // Send DELETE request to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_id: publicId,
            api_key: CLOUDINARY_API_KEY,
            timestamp,
            signature,
          }),
        }
      );

      if (response.ok) {
        console.log("✅ Image deleted from Cloudinary");
      } else {
        console.log("⚠️ Cloudinary delete response:", await response.text());
      }
    } catch (error) {
      console.error("❌ Cloudinary delete error:", error);
     
    }
  },

  /**
   * Delete multiple images from Cloudinary
   * Used when deleting a product with multiple images
   */
  deleteMultipleImages: async (imageUrls: string[]): Promise<void> => {
    if (!imageUrls || imageUrls.length === 0) return;

    console.log(`🗑️ Deleting ${imageUrls.length} images from Cloudinary...`);

    // Delete all images in parallel
    await Promise.all(
      imageUrls.map((url) => cloudinaryService.deleteImage(url))
    );

    console.log("✅ All images deleted");
  },

  // ========================================
  // VALIDATION FUNCTIONS
  // ========================================

  /**
   * Validate if URI is a valid image URI
   */
  isValidImageUri: (uri: string): boolean => {
    return (
      uri.startsWith("file://") ||
      uri.startsWith("content://") ||
      uri.startsWith("http://") ||
      uri.startsWith("https://")
    );
  },
};

// ========================================
// LEGACY EXPORTS (for backward compatibility)
// ========================================

export const uploadToCloudinary = cloudinaryService.uploadImage;
export const imageService = cloudinaryService; // Alias for existing code
