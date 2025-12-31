// src/hooks/useRequestForm.ts
import { useAuth } from "@/src/context/AuthContext";
import { requestApi } from "@/src/services/api/requestApi";
import { validationService } from "@/src/services/business/validationService";
import { useState } from "react";
import { Alert } from "react-native";

interface UseRequestFormReturn {
  // Form state
  title: string;
  budget: string;
  description: string;
  submitting: boolean;

  // Setters
  setTitle: (value: string) => void;
  setBudget: (value: string) => void;
  setDescription: (value: string) => void;

  // Actions
  submitRequest: () => Promise<boolean>;
  reset: () => void;
}

export function useRequestForm(): UseRequestFormReturn {
  const { user, userDoc } = useAuth();

  // Form state
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /**
   * Submit market request
   */
  const submitRequest = async (): Promise<boolean> => {
    // Check if user is logged in
    if (!user?.id) {
      Alert.alert("Error", "You must be logged in to post a request");
      return false;
    }

    // VALIDATION
    const validation = validationService.validateRequestForm({
      title,
      budget,
    });

    if (!validation.isValid) {
      Alert.alert("Missing Fields", validation.error || "Please fill all required fields");
      return false;
    }

    setSubmitting(true);

    try {
      // Create request in Supabase
      // Note: userDoc keys are now snake_case from the profiles table
      await requestApi.createRequest({
        title,
        budget,
        description,
        dealer_id: user.id, // Matches 'dealer_id' column
        dealer_name: userDoc?.display_name || "Unknown Dealer", // Matches 'dealer_name' column
      });

      // Show success message
      Alert.alert("Posted!", "Your request is now live.");

      // Reset form
      reset();

      return true;

    } catch (error) {
      console.error("❌ Error posting request:", error);
      Alert.alert("Error", "Could not post request. Please try again.");
      return false;

    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Reset form to initial state
   */
  const reset = () => {
    setTitle("");
    setBudget("");
    setDescription("");
  };

  return {
    title,
    budget,
    description,
    submitting,
    setTitle,
    setBudget,
    setDescription,
    submitRequest,
    reset,
  };
}