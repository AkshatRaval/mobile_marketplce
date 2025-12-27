// src/services/cloudinary/imageService.ts
// Handles ALL image uploads to Cloudinary

import type { CloudinaryUploadResponse } from '@/src/types';

// Cloudinary configuration
const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_NAME;
const UPLOAD_PRESET = "phone_images";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export const imageService = {
  /**
   * Upload a single image to Cloudinary
   * EXTRACTED FROM: upload.tsx (uploadToCloudinary function)
   */
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

      // console.log("✅ Image uploaded to Cloudinary:", data.secure_url);
      return data.secure_url;

    } catch (error) {
      console.error("❌ Cloudinary upload error:", error);
      throw new Error("Failed to upload image to Cloudinary");
    }
  },

  /**
   * Upload multiple images to Cloudinary
   * Used in product creation flow
   */
  uploadMultipleImages: async (uris: string[]): Promise<string[]> => {
    try {
      // console.log(`📤 Uploading ${uris.length} images to Cloudinary...`);
      
      const uploadPromises = uris.map((uri) => imageService.uploadImage(uri));
      const urls = await Promise.all(uploadPromises);
      
      // console.log(`✅ All ${urls.length} images uploaded successfully`);
      return urls;

    } catch (error) {
      console.error("❌ Error uploading multiple images:", error);
      throw error;
    }
  },

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

// Legacy export for backward compatibility
// You can use this if you already imported "uploadToCloudinary"
export const uploadToCloudinary = imageService.uploadImage;