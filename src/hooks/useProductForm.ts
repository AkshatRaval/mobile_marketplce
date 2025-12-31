// src/hooks/useProductForm.ts
import { useAuth } from "@/src/context/AuthContext";
import { productApi } from "@/src/services/api/productApi";
import { validationService } from "@/src/services/business/validationService";
import { imageService } from "@/src/services/cloudinary/imageService";
import { useState } from "react";
import { Alert } from "react-native";

interface UseProductFormReturn {
  name: string;
  price: string;
  description: string;
  uploading: boolean;
  
  // Setters
  setName: (value: string) => void;
  setPrice: (value: string) => void;
  setDescription: (value: string) => void;
  
  // Actions
  submitProduct: (images: string[]) => Promise<boolean>;
  reset: () => void;
}

export function useProductForm(): UseProductFormReturn {
  const { user } = useAuth(); // We just need the user object for the ID
  
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  /**
   * Submit product to Supabase
   */
  const submitProduct = async (images: string[]): Promise<boolean> => {
    // Check if user is logged in (Supabase uses 'id', not 'uid')
    if (!user?.id) {
      Alert.alert("Error", "You must be logged in to create a listing");
      return false;
    }

    // VALIDATION
    const validation = validationService.validateProductForm({
      name,
      price,
      description,
      images,
    });

    if (!validation.isValid) {
      Alert.alert("Missing info", validation.error || "Fill all fields.");
      return false;
    }

    setUploading(true);

    try {
      // STEP 1: Upload images to Cloudinary (Unchanged)
      const imageUrls = await Promise.all(
        images.map(imageService.uploadImage)
      );

      // STEP 2: Create product in Supabase
      // We no longer pass dealerName/city because the 'products' table 
      // is linked to 'profiles' via 'owner_id'.
      await productApi.createProduct({
        userId: user.id, // Matches Supabase schema
        name,
        price,
        description,
        images: imageUrls,
      });

      // STEP 3: Show success message
      Alert.alert("Success", "Listing added successfully!");

      return true;

    } catch (error) {
      console.error("❌ Error submitting product:", error);
      Alert.alert("Error", "Upload failed. Please try again.");
      return false;

    } finally {
      setUploading(false);
    }
  };

  /**
   * Reset form to initial state
   */
  const reset = () => {
    setName("");
    setPrice("");
    setDescription("");
  };

  return {
    name,
    price,
    description,
    uploading,
    setName,
    setPrice,
    setDescription,
    submitProduct,
    reset,
  };
}