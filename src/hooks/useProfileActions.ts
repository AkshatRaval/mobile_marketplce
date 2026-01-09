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
  recordSale: (product: any, saleDetails: any) => Promise<boolean>;
}

export function useProfileActions(
  userId: string | undefined,
  profileData: any
): UseProfileActionsReturn {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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

  // ✅ FIXED: Uses profileApi.recordSale which logs + deletes product
  const recordSale = async (product: any, saleDetails: {
      soldPrice: string;
      buyerName?: string;
      buyerPhone?: string;
      imei?: string;
      type: 'fast' | 'detailed';
  }) => {
    if (!userId) return false;
    setLoading(true);

    try {
        // Call the API method that handles both logging and deletion
        const success = await profileApi.recordSale(product, saleDetails);
        
        if (!success) {
            Alert.alert("Error", "Failed to record sale.");
        }
        
        return success;
    } catch (error) {
        console.error("Sale Record Error:", error);
        Alert.alert("Error", "Failed to record sale.");
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
    recordSale,
  };
}