// src/hooks/useRequestForm.ts
// Manages request form state and submission
// EXTRACTED FROM: requests.tsx form state + handlePostRequest (lines 34-110)

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

  // Form state - EXTRACTED FROM: requests.tsx lines 34-37
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /**
   * Submit market request
   * EXTRACTED FROM: requests.tsx handlePostRequest (lines 76-110)
   */
  const submitRequest = async (): Promise<boolean> => {
    // Check if user is logged in
    if (!user?.uid) {
      Alert.alert("Error", "You must be logged in to post a request");
      return false;
    }

    // VALIDATION - EXTRACTED FROM: requests.tsx lines 78-83
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
      // console.log("🚀 Submitting market request...");

      // Create request in Firebase
      await requestApi.createRequest({
        title,
        budget,
        description,
        dealerId: user.uid,
        dealerName: userDoc?.displayName || "Unknown Dealer",
      });

      // console.log("✅ Request posted successfully");

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
    // console.log("🔄 Request form reset");
  };

  return {
    // State
    title,
    budget,
    description,
    submitting,

    // Setters
    setTitle,
    setBudget,
    setDescription,

    // Actions
    submitRequest,
    reset,
  };
}