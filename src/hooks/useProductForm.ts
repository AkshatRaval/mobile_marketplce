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
  const { user, userDoc } = useAuth();
  
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  /**
   * Submit product to Firebase
   * EXTRACTED FROM: upload.tsx handlePost function (lines 95-129)
   * 
   * This function does:
   * 1. Validates form data
   * 2. Uploads images to Cloudinary
   * 3. Creates product in Firebase
   * 4. Shows success/error alerts
   */
  const submitProduct = async (images: string[]): Promise<boolean> => {
    // Check if user is logged in
    if (!user?.uid) {
      Alert.alert("Error", "You must be logged in to create a listing");
      return false;
    }

    // VALIDATION - EXTRACTED FROM: upload.tsx lines 97-101
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
    //   console.log("🚀 Starting product upload...");

      const imageUrls = await Promise.all(
        images.map(imageService.uploadImage)
      );
    //   console.log("✅ Images uploaded:", imageUrls);

      // STEP 2: Create product in Firebase
      // EXTRACTED FROM: upload.tsx lines 109-124
    //   console.log("📝 Creating product in Firebase...");
      const productId = await productApi.createProduct({
        userId: user.uid,
        dealerName: userDoc?.displayName || "Unknown",
        city: userDoc?.city || "Unknown",
        name,
        price,
        description,
        images: imageUrls,
      });
    //   console.log("✅ Product created with ID:", productId);

      // STEP 3: Show success message
      // EXTRACTED FROM: upload.tsx line 126
      Alert.alert("Success", "Listing added successfully!");

      return true;

    } catch (error) {
      console.error("❌ Error submitting product:", error);
      // EXTRACTED FROM: upload.tsx line 128
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
    // console.log("🔄 Form reset");
  };

  return {
    // State
    name,
    price,
    description,
    uploading,
    
    // Setters
    setName,
    setPrice,
    setDescription,
    
    // Actions
    submitProduct,
    reset,
  };
}