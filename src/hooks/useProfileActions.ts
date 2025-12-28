// src/hooks/useProfileActions.ts
// Profile actions (edit, delete, logout)
// EXTRACTED FROM: profile.tsx lines 169-296

import { profileApi } from "@/src/services/api/profileApi";
import { cloudinaryService } from "@/src/services/cloudinary/imageService";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";

interface UseProfileActionsReturn {
  // State
  loading: boolean;

  // Actions
  deleteProduct: (
    productId: string,
    productImages: string[]
  ) => Promise<boolean>;
  updateProduct: (
    productId: string,
    updates: {
      name: string;
      price: string;
      description: string;
    }
  ) => Promise<boolean>;
  logout: () => void;
}

export function useProfileActions(
  userId: string | undefined,
  profileData: any
): UseProfileActionsReturn {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const deleteProduct = async (
    productId: string,
    productImages: string[]
  ): Promise<boolean> => {
    if (!userId) {
      Alert.alert("Error", "User not logged in");
      return false;
    }

    setLoading(true);

    try {
      console.log("🗑️ Deleting product...");

      // Delete images from Cloudinary first
      // EXTRACTED FROM: profile.tsx lines 243-248
      if (productImages && productImages.length > 0) {
        await cloudinaryService.deleteMultipleImages(productImages);
      }

      // Delete product from Firebase
      // EXTRACTED FROM: profile.tsx lines 249-253
      await profileApi.deleteProduct(
        productId,
        userId,
        profileData.listings || []
      );

      console.log("✅ Product deleted successfully");
      return true;
    } catch (error) {
      console.error("Delete error:", error);
      Alert.alert("Error", "Failed to delete listing");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update product details
   * EXTRACTED FROM: profile.tsx handleSaveEdit (lines 265-283)
   *
   * BREAKDOWN:
   * LINE 266-267: Check parameters
   * LINE 268: setLoading(true)
   * LINE 269-273: Build updated fields
   * LINE 275-280: Update Firebase
   * LINE 282-283: Close modals
   */
  const updateProduct = async (
    productId: string,
    updates: {
      name: string;
      price: string;
      description: string;
    }
  ): Promise<boolean> => {
    if (!userId) {
      Alert.alert("Error", "User not logged in");
      return false;
    }

    setLoading(true);

    try {
      console.log("📝 Updating product...");

      // Update in Firebase
      // EXTRACTED FROM: profile.tsx lines 275-280
      await profileApi.updateProduct(
        productId,
        userId,
        updates,
        profileData.listings || []
      );

      console.log("✅ Product updated successfully");
      return true;
    } catch (error) {
      console.error("Update error:", error);
      Alert.alert("Error", "Failed to update listing");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout user
   * EXTRACTED FROM: profile.tsx handleLogout (lines 285-296)
   *
   * LINE 286: Alert.alert with confirmation
   * LINE 291: auth.signOut()
   * LINE 292: router.replace("/")
   */
  const logout = () => {
    Alert.alert("Log Out", "Are you sure you want to exit?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            // LINE 291: Sign out
            await profileApi.signOut();

            // LINE 292: Navigate to login
            router.replace("/");
          } catch (error) {
            Alert.alert("Error", "Failed to sign out");
          }
        },
      },
    ]);
  };

  return {
    loading,
    deleteProduct,
    updateProduct,
    logout,
  };
}
