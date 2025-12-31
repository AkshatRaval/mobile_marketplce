import { profileApi } from "@/src/services/api/profileApi";
import { cloudinaryService } from "@/src/services/cloudinary/imageService";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";

interface UseProfileActionsReturn {
  loading: boolean;
  deleteProduct: (productId: string, productImages: string[]) => Promise<boolean>;
  updateProduct: (productId: string, updates: any) => Promise<boolean>;
  logout: () => void;
  uploadProfileImage: (uri: string) => Promise<string | null>;
  updatePrivacySettings: (setting: string) => Promise<void>;
  
  // ✨ NEW Actions
  handleFastSale: (product: any) => Promise<boolean>;
  handleDetailedSale: (product: any, details: any) => Promise<boolean>;
}

export function useProfileActions(
  userId: string | undefined,
  profileData: any
): UseProfileActionsReturn {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // ... (deleteProduct, updateProduct, logout, uploadProfileImage, updatePrivacySettings unchanged)

  const deleteProduct = async (productId: string, productImages: string[]) => {
    if (!userId) return false;
    setLoading(true);
    try {
      if (productImages?.length > 0) {
        await cloudinaryService.deleteMultipleImages(productImages);
      }
      await profileApi.deleteProduct(productId, userId, profileData.listings || []);
      return true;
    } catch (error) {
      Alert.alert("Error", "Failed to delete listing");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async (productId: string, updates: any) => {
    if (!userId) return false;
    setLoading(true);
    try {
      await profileApi.updateProduct(productId, userId, updates, profileData.listings || []);
      return true;
    } catch (error) {
      Alert.alert("Error", "Failed to update listing");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    Alert.alert("Log Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: async () => {
          await profileApi.signOut();
          router.replace("/");
      }}
    ]);
  };

  const uploadProfileImage = async (uri: string) => {
    if (!userId) return null;
    setLoading(true);
    try {
      const imageUrl = await cloudinaryService.uploadImage(uri);
      await profileApi.updateUser(userId, { photoURL: imageUrl });
      return imageUrl;
    } catch (error) {
      Alert.alert("Error", "Failed to upload image.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updatePrivacySettings = async (setting: string) => {
    if (!userId) return;
    await profileApi.updateUser(userId, { privacySettings: setting });
  };

  // ✨ NEW: Fast Sale (No logs kept locally, just marked sold/deleted)
  const handleFastSale = async (product: any) => {
    if (!userId) return false;
    setLoading(true);
    try {
      // For fast sale, we assume sold price = listed price
      await profileApi.logSale(userId, product, {
        type: "fast",
        soldPrice: product.price,
      });
      return true;
    } catch (error) {
      Alert.alert("Error", "Failed to mark as sold.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ✨ NEW: Detailed Sale
  const handleDetailedSale = async (product: any, details: any) => {
    if (!userId) return false;
    setLoading(true);
    try {
      await profileApi.logSale(userId, product, {
        type: "detailed",
        ...details
      });
      return true;
    } catch (error) {
      Alert.alert("Error", "Failed to save sale log.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    deleteProduct,
    updateProduct,
    logout,
    uploadProfileImage,
    updatePrivacySettings,
    handleFastSale,
    handleDetailedSale,
  };
}